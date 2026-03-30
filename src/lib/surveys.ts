export interface InstrumentDef {
  name: string;
  label: string;
}

export interface VisitTypeDef {
  key: string;
  label: string;
  eventName: string;
  recipient: "child" | "parent";
  instruments: InstrumentDef[];
  dateField?: string; // field in team_facing_arm_1 for visit date
}

// Internal/scoring instruments to exclude from participant-facing counts
const EXCLUDED_INSTRUMENTS = new Set([
  "scoring_child",
  "scoring_child_pnr_count",
  "scoring_child_pnr_percent",
  "scoring_child_final",
  "scoring_adult",
  "scoring_adult_pnr_count",
  "scoring_adult_pnr_percent",
  "scoring_adult_final",
  "scoring_poc",
  "scoring_poc_pnr_count",
  "scoring_poc_pnr_percent",
  "scoring_poc_final",
  "ra_trigger_form",
]);

export const VISIT_TYPES: VisitTypeDef[] = [
  {
    key: "v1_child",
    label: "V1 Child Surveys",
    eventName: "v1_child_surveys_arm_1",
    recipient: "child",
    dateField: "spark_date_v1",
    instruments: [
      { name: "spark_surveys", label: "SPARK Surveys" },
      { name: "ius12_child_version", label: "IUS-12 Child Version" },
      { name: "pvq_child_version", label: "PVQ Child Version" },
      { name: "ctqsf_child_version", label: "CTQ-SF Child Version" },
      { name: "dsm5cc_child_version", label: "DSM5CC Child Version" },
      { name: "quic_child_version", label: "QUIC Child Version" },
      { name: "rcads25_child_version", label: "RCADS-25 Child Version" },
      { name: "pds_child_version", label: "PDS Child Version" },
      { name: "mte_child_version", label: "MTE Child Version" },
      { name: "fqq_child_version", label: "FQQ Child Version" },
      { name: "crsq_child_version", label: "CRSQ Child Version" },
      { name: "af5_child_version", label: "AF-5 Child Version" },
      { name: "bfne_child_version", label: "BFnE Child Version" },
      { name: "calis_child_version", label: "CALIS Child Version" },
      { name: "derssf_child_version", label: "DERS-SF Child Version" },
      { name: "lsds_child_version", label: "LSDS Child Version" },
      { name: "nbs_child_version", label: "NBS Child Version" },
      { name: "pasa_child_version", label: "PASA Child Version" },
      { name: "smds_child_version", label: "SMDS Child Version" },
      { name: "ari_child_version", label: "ARI Child Version" },
    ],
  },
  {
    key: "v2_child",
    label: "V2 Child Surveys",
    eventName: "v2_child_surveys_arm_1",
    recipient: "child",
    dateField: "spark_date",
    instruments: [
      { name: "peer_rating", label: "Peer Rating" },
      { name: "scared_child_version", label: "SCARED Child Version" },
      { name: "cdi_child_version", label: "CDI Child Version" },
      { name: "posttask_panas", label: "Post-Task PANAS" },
    ],
  },
  {
    key: "v2_parent",
    label: "V2 Parent Surveys",
    eventName: "v2_parent_surveys_arm_1",
    recipient: "parent",
    dateField: "spark_date",
    instruments: [
      { name: "demographics_spark", label: "Demographics SPARK" },
      { name: "scared_parent_on_child", label: "SCARED Parent on Child" },
      { name: "cbcl_parent_on_child", label: "CBCL Parent On Child" },
      { name: "saca_parent_on_child", label: "SACA Parent On Child" },
      { name: "rbsr_parent_on_child", label: "RBS-R Parent on Child" },
      { name: "srs2_parent_on_child", label: "SRS2 Parent On Child" },
      { name: "pds_parent_on_child", label: "PDS Parent On Child" },
      { name: "scq_parent_on_child", label: "SCQ Parent On Child" },
      { name: "calis_parent_on_child", label: "CALIS Parent On Child" },
      { name: "rcads25_parent_on_child", label: "RCADS-25 Parent On Child" },
      {
        name: "dsm5cc_parent_on_child_version",
        label: "DSM5-CC Parent On Child",
      },
      { name: "ari_parent_on_child", label: "ARI Parent on Child" },
      { name: "cshqsf_parent_on_child", label: "CSHQ-SF Parent on Child" },
      { name: "fasa_parent_on_child", label: "FASA Parent On Child" },
      { name: "scaared_adult_version", label: "SCAARED Adult Version" },
      { name: "bdiii_adult_version", label: "BDI-II Adult Version" },
      { name: "dsm5cc_adult_version", label: "DSM5-CC Adult Version" },
      { name: "psdq_adult_version", label: "PSDQ Adult Version" },
      {
        name: "hair_sampling_questionnaire",
        label: "Hair Sampling Questionnaire",
      },
    ],
  },
  {
    key: "6mo_child",
    label: "6-Month Child Surveys",
    eventName: "6_month_child_surv_arm_1",
    recipient: "child",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_child_version", label: "SCARED Child Version" },
      { name: "pvq_child_version", label: "PVQ Child Version" },
      { name: "dsm5cc_child_version_sf", label: "DSM5CC Child Version (SF)" },
      {
        name: "rcads25_child_version_sf",
        label: "RCADS-25 Child Version (SF)",
      },
      { name: "pds_child_version", label: "PDS Child Version" },
      { name: "af5_child_version", label: "AF-5 Child Version" },
      { name: "calis_child_version", label: "CALIS Child Version" },
      { name: "lsds_child_version", label: "LSDS Child Version" },
      { name: "ari_child_version", label: "ARI Child Version" },
    ],
  },
  {
    key: "6mo_parent",
    label: "6-Month Parent Surveys",
    eventName: "6_month_parent_sur_arm_1",
    recipient: "parent",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_parent_on_child", label: "SCARED Parent on Child" },
      { name: "saca_parent_on_child", label: "SACA Parent On Child" },
      { name: "pds_parent_on_child", label: "PDS Parent On Child" },
      { name: "calis_parent_on_child", label: "CALIS Parent On Child" },
      {
        name: "rcads25_parent_on_child_sf",
        label: "RCADS-25 Parent On Child (SF)",
      },
      {
        name: "dsm5cc_parent_on_child_version_sf",
        label: "DSM5-CC Parent On Child (SF)",
      },
      { name: "ari_parent_on_child", label: "ARI Parent on Child" },
      { name: "fasa_parent_on_child", label: "FASA Parent On Child" },
      { name: "scaared_adult_version", label: "SCAARED Adult Version" },
      { name: "bdiii_adult_version", label: "BDI-II Adult Version" },
      { name: "dsm5cc_adult_version_sf", label: "DSM5-CC Adult Version (SF)" },
    ],
  },
  {
    key: "12mo_child",
    label: "12-Month Child Surveys",
    eventName: "12_month_child_sur_arm_1",
    recipient: "child",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_child_version", label: "SCARED Child Version" },
      { name: "pvq_child_version", label: "PVQ Child Version" },
      { name: "dsm5cc_child_version_sf", label: "DSM5CC Child Version (SF)" },
      {
        name: "rcads25_child_version_sf",
        label: "RCADS-25 Child Version (SF)",
      },
      { name: "pds_child_version", label: "PDS Child Version" },
      { name: "mte_child_version", label: "MTE Child Version" },
      { name: "af5_child_version", label: "AF-5 Child Version" },
      { name: "calis_child_version", label: "CALIS Child Version" },
      { name: "lsds_child_version", label: "LSDS Child Version" },
      { name: "ari_child_version", label: "ARI Child Version" },
    ],
  },
  {
    key: "12mo_parent",
    label: "12-Month Parent Surveys",
    eventName: "12_month_parent_su_arm_1",
    recipient: "parent",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_parent_on_child", label: "SCARED Parent on Child" },
      { name: "saca_parent_on_child", label: "SACA Parent On Child" },
      { name: "pds_parent_on_child", label: "PDS Parent On Child" },
      { name: "calis_parent_on_child", label: "CALIS Parent On Child" },
      {
        name: "rcads25_parent_on_child_sf",
        label: "RCADS-25 Parent On Child (SF)",
      },
      {
        name: "dsm5cc_parent_on_child_version_sf",
        label: "DSM5-CC Parent On Child (SF)",
      },
      { name: "ari_parent_on_child", label: "ARI Parent on Child" },
      { name: "fasa_parent_on_child", label: "FASA Parent On Child" },
      { name: "scaared_adult_version", label: "SCAARED Adult Version" },
      { name: "bdiii_adult_version", label: "BDI-II Adult Version" },
      { name: "dsm5cc_adult_version_sf", label: "DSM5-CC Adult Version (SF)" },
    ],
  },
  {
    key: "18mo_child",
    label: "18-Month Child Surveys",
    eventName: "18_month_child_sur_arm_1",
    recipient: "child",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_child_version", label: "SCARED Child Version" },
      { name: "pvq_child_version", label: "PVQ Child Version" },
      { name: "dsm5cc_child_version_sf", label: "DSM5CC Child Version (SF)" },
      {
        name: "rcads25_child_version_sf",
        label: "RCADS-25 Child Version (SF)",
      },
      { name: "pds_child_version", label: "PDS Child Version" },
      { name: "af5_child_version", label: "AF-5 Child Version" },
      { name: "calis_child_version", label: "CALIS Child Version" },
      { name: "lsds_child_version", label: "LSDS Child Version" },
      { name: "ari_child_version", label: "ARI Child Version" },
    ],
  },
  {
    key: "18mo_parent",
    label: "18-Month Parent Surveys",
    eventName: "18_month_parent_su_arm_1",
    recipient: "parent",
    instruments: [
      { name: "spark_follow_up_surveys", label: "SPARK Follow Up Surveys" },
      { name: "scared_parent_on_child", label: "SCARED Parent on Child" },
      { name: "saca_parent_on_child", label: "SACA Parent On Child" },
      { name: "pds_parent_on_child", label: "PDS Parent On Child" },
      { name: "calis_parent_on_child", label: "CALIS Parent On Child" },
      {
        name: "rcads25_parent_on_child_sf",
        label: "RCADS-25 Parent On Child (SF)",
      },
      {
        name: "dsm5cc_parent_on_child_version_sf",
        label: "DSM5-CC Parent On Child (SF)",
      },
      { name: "ari_parent_on_child", label: "ARI Parent on Child" },
      { name: "fasa_parent_on_child", label: "FASA Parent On Child" },
      { name: "scaared_adult_version", label: "SCAARED Adult Version" },
      { name: "bdiii_adult_version", label: "BDI-II Adult Version" },
      { name: "dsm5cc_adult_version_sf", label: "DSM5-CC Adult Version (SF)" },
    ],
  },
];

export function getVisitType(key: string): VisitTypeDef | undefined {
  return VISIT_TYPES.find((v) => v.key === key);
}

export function getCompletionFieldName(instrumentName: string): string {
  return `${instrumentName}_complete`;
}

// Get visit types that apply to V1/V2 overview dashboard
export const V1_V2_VISIT_TYPES = VISIT_TYPES.filter((v) =>
  ["v1_child", "v2_child", "v2_parent"].includes(v.key)
);

// Get follow-up visit types
export const FOLLOWUP_VISIT_TYPES = VISIT_TYPES.filter((v) =>
  v.key.includes("mo_")
);

// Follow-up months with their child/parent visit type keys
export const FOLLOWUP_PERIODS = [
  { months: 6, childKey: "6mo_child", parentKey: "6mo_parent", label: "6-Month" },
  { months: 12, childKey: "12mo_child", parentKey: "12mo_parent", label: "12-Month" },
  { months: 18, childKey: "18mo_child", parentKey: "18mo_parent", label: "18-Month" },
];
