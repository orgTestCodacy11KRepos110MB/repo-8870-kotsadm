import _ from "lodash";
import { Stores } from "../../schema/stores";
import { Context } from "../../context";
import { ReplicatedError } from "../../server/errors";
import { KotsApp } from "../";

export function KotsQueries(stores: Stores) {
  return {

    async getKotsApp(root: any, args: any, context: Context): Promise<KotsApp> {
      const { slug, id } = args;
      if (!id && !slug) {
        throw new ReplicatedError("One of slug or id is required");
      }
      let _id;
      if (slug) {
        _id = await stores.kotsAppStore.getIdFromSlug(slug)
      } else {
        _id = id;
      }
      const result = await stores.kotsAppStore.getApp(_id);
      return result.toSchema();
    },

    // TODO: This code is currently duplicated between kots apps and wathes. 
    // It should be refactored so that you can get a file tree/download files
    // by a id/sequence number regardless of the app type.
    async getKotsApplicationTree(root: any, args: any, context: Context): Promise<string> {
      const appId = await stores.kotsAppStore.getIdFromSlug(args.slug);
      const app = await stores.kotsAppStore.getApp(appId); // TODO: Move to context? 
      const tree = await app.generateFileTreeIndex(args.sequence);
      if (_.isEmpty(tree) || !tree[0].children) {
        throw new ReplicatedError(`Unable to get files for watch with ID of ${app.id}`);
      }
      // return children so you don't start with the "out" dir as top level in UI
      return JSON.stringify(tree[0].children);
    },

    async getKotsFiles(root: any, args: any, context: Context): Promise<string> {
      const appId = await stores.kotsAppStore.getIdFromSlug(args.slug);
      const app = await stores.kotsAppStore.getApp(appId); // TODO: Move to context? 
      const files = await app.getFiles(args.sequence, args.fileNames);
      const jsonFiles = JSON.stringify(files.files);
      if (jsonFiles.length >= 5000000) {
        throw new ReplicatedError(`File is too large, the maximum allowed length is 5000000 but found ${jsonFiles.length}`);
      }
      return jsonFiles;
    }

  }
}