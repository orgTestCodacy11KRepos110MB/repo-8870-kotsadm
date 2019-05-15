import * as GitHubApi from "@octokit/rest";
import { addWeeks } from "date-fns";
// @ts-ignore
import * as jaeger from "jaeger-client";
import * as jwt from "jsonwebtoken";
import * as randomstring from "randomstring";

import { Params } from "../server/params";
import * as pg from "pg";
import { Session } from "./session";

const invalidSession = {
  auth: "",
  expiration: new Date(Date.now()),
  userId: "",
  sessionId: "",
};

export type InstallationMap = {
  [key: string]: number;
};

export class SessionStore {
  constructor(private readonly pool: pg.Pool, private readonly params: Params) {}

  createInstallationMap(installations: GitHubApi.GetInstallationsResponseInstallationsItem[]): InstallationMap {
    return installations.reduce((installationAcctMap: InstallationMap, { id, account }) => {
      const lowerLogin = account.login.toLowerCase();
      installationAcctMap[lowerLogin] = id;

      return installationAcctMap;
    }, {});
  }

  async createGithubSession(token: string, userId: string): Promise<string> {
    const github = new GitHubApi();
    github.authenticate({
      type: "token",
      token,
    });
    const { data: installationData } = await github.users.getInstallations({});
    const { installations } = installationData as {
      total_count: number;
      installations: GitHubApi.GetInstallationsResponseInstallationsItem[];
    };

    const installationMap = this.createInstallationMap(installations);

    const sessionId = randomstring.generate({ capitalization: "lowercase" });

    const q = `INSERT INTO session (id, user_id, metadata, expire_at) VALUES($1, $2, $3, $4)`;

    const currentUtcDate = new Date(Date.now()).toUTCString();
    const expirationDate = addWeeks(currentUtcDate, 2);
    const v = [sessionId, userId, JSON.stringify(installationMap), expirationDate];

    await this.pool.query(q, v);

    return jwt.sign(
      {
        token,
        sessionId,
      },
      this.params.sessionKey,
    );
  }

  async refreshGithubTokenMetadata(ctx: jaeger.SpanContext, token: string, sessionId: string): Promise<void> {
    const github = new GitHubApi();
    github.authenticate({
      type: "token",
      token,
    });
    const { data: installationData } = await github.users.getInstallations({});
    const { installations } = installationData as {
      total_count: number;
      installations: GitHubApi.GetInstallationsResponseInstallationsItem[];
    };

    const updatedInstallationMap = this.createInstallationMap(installations);

    const q = `UPDATE session SET metadata = $1 WHERE id = $2`;
    const v = [updatedInstallationMap, sessionId];
    await this.pool.query(q, v);
  }

  public async getGithubSession(sessionId: string): Promise<Session> {
    const q = `select id, user_id, metadata, expire_at from session where id = $1`;
    const v = [sessionId];

    const result = await this.pool.query(q, v);

    const session: Session = new Session();
    session.id = result.rows[0].id;
    session.userId = result.rows[0].user_id;
    session.metadata = result.rows[0].metadata;
    session.expiresAt = result.rows[0].expire_at;

    return session;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const q = `delete from session where id = $1`;
    const v = [sessionId];

    await this.pool.query(q, v);
  }

  public async decode(token: string): Promise<Session | any> {
    //tslint:disable-next-line possible-timing-attack
    if (token.length > 0 && token !== "null") {
      try {
        const decoded: any = jwt.verify(token, this.params.sessionKey);

        const session = await this.getGithubSession(decoded.sessionId);
        return {
          scmToken: decoded.token,
          metadata: JSON.parse(session.metadata!),
          expiration: session.expiresAt,
          userId: session.userId,
          sessionId: session.id,
        };
      } catch (e) {
        // Errors here negligible as they are from jwts not passing verification
      }
    }

    return invalidSession;
  }
}