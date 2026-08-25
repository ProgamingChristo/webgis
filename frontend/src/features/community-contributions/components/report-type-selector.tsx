import { CONTRIBUTION_REPORT_OPTIONS } from "../constants";
import type {
  CommunityContributionReportType,
} from "../types/community-contributions.types";
import styles from "./community-contributions.module.css";

type ReportTypeSelectorProps = {
  value: CommunityContributionReportType;
  onChange(value: CommunityContributionReportType): void;
};

export function ReportTypeSelector({
  value,
  onChange,
}: ReportTypeSelectorProps) {
  const groups = [
    "Aksesibilitas & Infrastruktur",
    "Perubahan Data Usaha",
  ] as const;

  return (
    <div className={styles.selector}>
      <h2>Apa yang ingin Anda laporkan?</h2>
      {groups.map((group) => (
        <fieldset className={styles.optionGroup} key={group}>
          <legend>{group}</legend>
          {CONTRIBUTION_REPORT_OPTIONS.filter((option) => option.group === group).map(
            (option) => (
              <label
                className={
                  value === option.type
                    ? styles.reportOptionActive
                    : styles.reportOption
                }
                key={option.type}
              >
                <span className={styles.optionTitle}>
                  <input
                    checked={value === option.type}
                    name="report_type"
                    onChange={() => onChange(option.type)}
                    type="radio"
                    value={option.type}
                  />
                  {option.label}
                </span>
                <span className={styles.optionSummary}>{option.summary}</span>
              </label>
            ),
          )}
        </fieldset>
      ))}
    </div>
  );
}
