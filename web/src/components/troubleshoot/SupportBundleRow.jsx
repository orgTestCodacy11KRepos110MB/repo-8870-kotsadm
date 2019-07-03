import * as React from "react";
import { withRouter, Link } from "react-router-dom";
import ReactTooltip from "react-tooltip"
import dayjs from "dayjs";
import filter from "lodash/filter";
import sortBy from "lodash/sortBy";
// import { VendorUtilities } from "../../utilities/VendorUtilities";

class SupportBundleRow extends React.Component {

  renderSharedContext = () => {
    const { bundle } = this.props;
    if (!bundle) {return null;}
    // const notSameTeam = bundle.teamId !== VendorUtilities.getTeamId();
    // const isSameTeam = bundle.teamId === VendorUtilities.getTeamId();
    // const sharedIds = bundle.teamShareIds || [];
    // const isShared = sharedIds.length;
    // let shareContext;

    // if (notSameTeam) {
    //   shareContext = <span className="u-marginLeft--normal u-fontSize--normal u-color--chateauGreen">Shared by <span className="u-fontWeight--bold">{bundle.teamName}</span></span>
    // } else if (isSameTeam && isShared) {
    //   shareContext = <span className="u-marginLeft--normal u-fontSize--normal u-fontWeight--medium u-color--tundora">Shared with Replicated</span>
    // }
    // return shareContext;
  }

  render() {
    const { bundle, watchSlug } = this.props;

    if (!bundle) return null;

    return (
      <div className="SupportBundle--Row u-position--relative">
        <Link to={`/watch/${watchSlug}/troubleshoot/analyze/${bundle.slug}`}>
          <div className="bundle-row-wrapper">
            <div className="bundle-row flex-column flex1">
              <div className="flex flex1">
                <div className="flex1 flex">
                  {!this.props.isCustomer && bundle.customer ?
                    <div className="flex-column flex1 flex-verticalCenter">
                      <span className="u-fontSize--large u-color--tuna u-fontWeight--medium u-cursor--pointer">
                        <span>Uploaded on <span className="u-fontWeight--bold">{dayjs(bundle.createdAt).format("MMMM D, YYYY")}</span></span>
                      </span>
                    </div>
                    :
                    <div className="flex-column flex1 flex-verticalCenter">
                      <span>
                        <span className="u-fontSize--large u-cursor--pointer u-color--tuna u-fontWeight--medium">Uploaded on <span className="u-fontWeight--medium">{dayjs(bundle.createdAt).format("MMMM D, YYYY")}</span></span>
                        {this.renderSharedContext()}
                      </span>
                    </div>
                  }
                </div>
              </div>
              <div className="flex flex1 u-marginTop--10">
                {bundle?.analysis?.insights?.length ?
                  <div className="flex flex1 u-marginRight--5">
                    {sortBy(filter(bundle?.analysis?.insights, (i) => i.level !== "debug"), ["desiredPosition"]).map((insight, i) => (
                      <div key={i} className="analysis-icon-wrapper">
                        {insight.icon_key ?
                          <span className={`icon clickable analysis-${insight.icon_key}`} data-tip={`${bundle.id}-${i}-${insight.key}`} data-for={`${bundle.id}-${i}-${insight.key}`}></span>
                          : insight.icon ?
                            <span className="u-cursor--pointer" style={{ backgroundImage: `url(${insight.icon})` }} data-tip={`${bundle.id}-${i}-${insight.key}`} data-for={`${bundle.id}-${i}-${insight.key}`}></span>
                            : null
                        }
                        <ReactTooltip id={`${bundle.id}-${i}-${insight.key}`} effect="solid" className="replicated-tooltip">
                          <span>{insight.detail}</span>
                        </ReactTooltip>
                      </div>
                    ))}
                  </div>
                  :
                  <p className="u-fontSize--small u-fontWeight--medium u-color--doveGray">Unable to surface insights for this bundle</p>
                }
              </div>
            </div>
          </div>
        </Link>
      </div >
    );
  }
}

export default withRouter(SupportBundleRow);