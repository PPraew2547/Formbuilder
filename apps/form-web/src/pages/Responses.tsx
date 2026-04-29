import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { responseApi } from "../api.ts";
import type {
  ResponseItem,
  ResponseAnswer,
  SubmissionAttempt,
  SubmissionEvent,
} from "../api.ts";

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  new: { bg: "#eef0fd", color: "#667eea" },
  reviewed: { bg: "#edfcf2", color: "#22c55e" },
  archived: { bg: "#f5f5f5", color: "#aaa" },
};

const STATUS_CYCLE: Record<string, ResponseItem["status"]> = {
  new: "reviewed",
  reviewed: "archived",
  archived: "new",
};

const PER_PAGE = 6;

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Responses(): ReactElement {
  const [rows, setRows] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<ResponseItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data: ResponseItem[] = await responseApi.list();
        if (!cancelled) setRows(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (
    id: string,
    status: ResponseItem["status"],
  ) => {
    try {
      const updated = await responseApi.update(id, { status });

      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: updated.status,
              }
            : row,
        ),
      );

      setDetail((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              status: updated.status,
            }
          : prev,
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update response status.");
    }
  };

  const openDetail = async (row: ResponseItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetail(row);

    try {
      const data = await responseApi.get(row.id);
      setDetail(data);
    } catch (err) {
      console.error(err);
      setDetailError("Failed to load response detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailError("");
    setDetail(null);
  };

  const filtered = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (r.formTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.respondent.toLowerCase().includes(search.toLowerCase())),
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCsv = async () => {
    if (filtered.length === 0) {
      alert("No responses to export.");
      return;
    }

    const detailedRows = await Promise.all(
      filtered.map(async (row) => {
        try {
          return await responseApi.get(row.id);
        } catch {
          return row;
        }
      }),
    );

    const answerKeys = Array.from(
      new Set(
        detailedRows.flatMap((row) =>
          (row.answers ?? []).map((answer) => answer.label || answer.key),
        ),
      ),
    );

    const headers = [
      "ID",
      "Form",
      "Respondent",
      "Submitted",
      "Entries",
      "Status",
      ...answerKeys,
    ];

    const csvRows = detailedRows.map((row) => {
      const answerMap = new Map<string, unknown>();

      (row.answers ?? []).forEach((answer) => {
        answerMap.set(answer.label || answer.key, answer.value);
      });

      return [
        row.id,
        row.formTitle,
        row.respondent,
        row.submittedAt,
        row.entries,
        row.status,
        ...answerKeys.map((key) => formatAnswerValue(answerMap.get(key))),
      ];
    });

    const csv = [
      headers.map(escapeCsv).join(","),
      ...csvRows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `responses-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const root: React.CSSProperties = {
    padding: "32px 40px",
    background: "#f5f5f7",
    minHeight: "calc(100vh - 56px)",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  };

  const tableCard: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #ebebeb",
    borderRadius: 16,
    overflow: "hidden",
  };

  const filterGroup: React.CSSProperties = {
    display: "flex",
    background: "#f0f0f0",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  };

  const searchInput: React.CSSProperties = {
    padding: "9px 14px 9px 36px",
    border: "1.5px solid #e5e5e5",
    borderRadius: 10,
    fontSize: 13,
    outline: "none",
    background: "#fff",
    color: "#1a1a1a",
    fontFamily: "inherit",
    width: 220,
  };

  const exportBtn: React.CSSProperties = {
    padding: "9px 18px",
    borderRadius: 10,
    border: "1.5px solid #e5e5e5",
    background: "#fff",
    color: "#555",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "12px 16px",
    background: "#fafafa",
    borderBottom: "1px solid #f0f0f0",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#1a1a1a",
    padding: "13px 16px",
    verticalAlign: "middle",
  };

  const viewBtn: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 7,
    border: "1.5px solid #667eea",
    background: "transparent",
    color: "#667eea",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const skBase: React.CSSProperties = {
    background: "#f0f0f0",
    borderRadius: 6,
  };

  const skRow: React.CSSProperties = {
    padding: "13px 16px",
    display: "flex",
    gap: 16,
    alignItems: "center",
  };

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "inherit",
    background: active ? "#fff" : "transparent",
    color: active ? "#1a1a1a" : "#888",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  });

  const badge = (status: string): React.CSSProperties => ({
    ...(STATUS_COLOR[status] ?? STATUS_COLOR.new),
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "capitalize",
    cursor: "pointer",
  });

  const pageBtn = (
    active: boolean,
    disabled: boolean,
  ): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1.5px solid",
    borderColor: active ? "#667eea" : "#ebebeb",
    background: active ? "#eef0fd" : "#fff",
    color: active ? "#667eea" : disabled ? "#ccc" : "#555",
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  });

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 24,
  };

  const modal: React.CSSProperties = {
    width: "100%",
    maxWidth: 760,
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
    overflow: "hidden",
  };

  const modalHeader: React.CSSProperties = {
    padding: "20px 24px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const closeBtn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #eee",
    background: "#fff",
    cursor: "pointer",
    fontSize: 18,
    color: "#777",
  };

  const detailGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    rowGap: 14,
    columnGap: 16,
    padding: "20px 24px 26px",
    maxHeight: "70vh",
    overflowY: "auto",
  };

  const detailLabel: React.CSSProperties = {
    fontSize: 12,
    color: "#999",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const detailValue: React.CSSProperties = {
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: 500,
    overflowWrap: "anywhere",
  };

  const answerCard: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #eee",
    borderRadius: 10,
    background: "#fafafa",
  };

  const answerLabel: React.CSSProperties = {
    fontSize: 11,
    color: "#777",
    fontWeight: 800,
    marginBottom: 5,
  };

  const answerText: React.CSSProperties = {
    fontSize: 13,
    color: "#1a1a1a",
    lineHeight: 1.5,
  };

  const attemptCard: React.CSSProperties = {
    padding: "12px",
    border: "1px solid #eee",
    borderRadius: 10,
    background: "#fafafa",
    display: "grid",
    gap: 8,
  };

  const attemptTop: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const attemptStatus = (status?: string | null): React.CSSProperties => {
    const isSuccess = status === "success" || status === "forwarded";
    const isFailed = status === "failed" || status === "error";

    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "3px 9px",
      fontSize: 11,
      fontWeight: 800,
      textTransform: "capitalize",
      background: isSuccess ? "#edfcf2" : isFailed ? "#fef2f2" : "#f5f5f5",
      color: isSuccess ? "#16a34a" : isFailed ? "#dc2626" : "#777",
    };
  };

  const statusButton = (
    statusOption: ResponseItem["status"],
    currentStatus: ResponseItem["status"],
  ): React.CSSProperties => ({
    border: "none",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textTransform: "capitalize",
    background:
      currentStatus === statusOption
        ? STATUS_COLOR[statusOption].bg
        : "#f5f5f5",
    color:
      currentStatus === statusOption
        ? STATUS_COLOR[statusOption].color
        : "#999",
  });

  const HEADERS = [
    "ID",
    "Form",
    "Respondent",
    "Submitted",
    "Fields",
    "Status",
    "",
  ];

  return (
    <div style={root}>
      <div style={topRow}>
        <div style={{ fontSize: 13, color: "#999" }}>
          {filtered.length} response{filtered.length !== 1 ? "s" : ""}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={filterGroup}>
            {["all", "new", "reviewed", "archived"].map((f: string) => (
              <button
                key={f}
                type="button"
                style={filterBtn(filter === f)}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#ccc",
                fontSize: 14,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>

            <input
              style={searchInput}
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button type="button" style={exportBtn} onClick={() => void exportCsv()}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div style={tableCard}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {HEADERS.map((h: string, i: number) => (
                <th key={i} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [0, 1, 2, 3].map((i: number) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div style={skRow}>
                      {([50, 160, 160, 120, 40, 70, 50] as number[]).map(
                        (w: number, j: number) => (
                          <div
                            key={j}
                            style={{ ...skBase, height: 14, width: w }}
                          />
                        ),
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "#bbb",
                    padding: 48,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                  <div>No responses found</div>
                </td>
              </tr>
            ) : (
              paged.map((r: ResponseItem) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid #f8f8f8",
                    background: selected === r.id ? "#fafbff" : "#fff",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                >
                  <td style={{ ...tdStyle, color: "#bbb", fontSize: 12 }}>
                    {r.id}
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.formTitle}</td>

                  <td style={{ ...tdStyle, color: "#777" }}>{r.respondent}</td>

                  <td style={{ ...tdStyle, color: "#aaa", fontSize: 12 }}>
                    {r.submittedAt}
                  </td>

                  <td style={{ ...tdStyle, color: "#aaa" }}>{r.entries}</td>

                  <td style={tdStyle}>
                    <span
                      style={badge(r.status)}
                      title="Click to change status"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleStatusChange(r.id, STATUS_CYCLE[r.status]);
                      }}
                    >
                      {r.status}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <button
                      style={viewBtn}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openDetail(r);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > PER_PAGE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <div style={{ fontSize: 13, color: "#aaa" }}>
              Showing {(page - 1) * PER_PAGE + 1}–
              {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={pageBtn(false, page === 1)}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>

              {Array.from(
                { length: totalPages },
                (_: unknown, i: number) => i + 1,
              ).map((p: number) => (
                <button
                  key={p}
                  style={pageBtn(p === page, false)}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                style={pageBtn(false, page === totalPages)}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {detailOpen && (
        <div style={overlay} onClick={closeDetail}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>
                  Response Detail
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  Submission information
                </div>
              </div>

              <button type="button" style={closeBtn} onClick={closeDetail}>
                ×
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: 24, color: "#999", fontSize: 13 }}>
                Loading detail…
              </div>
            ) : detailError ? (
              <div style={{ padding: 24, color: "#dc2626", fontSize: 13 }}>
                {detailError}
              </div>
            ) : detail ? (
              <div style={detailGrid}>
                <div style={detailLabel}>ID</div>
                <div style={detailValue}>{detail.id}</div>

                <div style={detailLabel}>Form</div>
                <div style={detailValue}>{detail.formTitle}</div>

                <div style={detailLabel}>Respondent</div>
                <div style={detailValue}>{detail.respondent}</div>

                <div style={detailLabel}>Submitted</div>
                <div style={detailValue}>{detail.submittedAt}</div>

                <div style={detailLabel}>Entries</div>
                <div style={detailValue}>{detail.entries}</div>

                <div style={detailLabel}>Status</div>
                <div style={detailValue}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {(["new", "reviewed", "archived"] as ResponseItem["status"][]).map(
                      (statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() =>
                            void handleStatusChange(detail.id, statusOption)
                          }
                          style={statusButton(statusOption, detail.status)}
                        >
                          {statusOption}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div style={detailLabel}>Answers</div>
                <div style={detailValue}>
                  {(detail.answers ?? []).length === 0 ? (
                    <span style={{ color: "#999" }}>
                      No submitted answers found.
                    </span>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {(detail.answers ?? []).map((answer: ResponseAnswer) => (
                        <div key={answer.key} style={answerCard}>
                          <div style={answerLabel}>{answer.label}</div>
                          <div style={answerText}>
                            {formatAnswerValue(answer.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={detailLabel}>Forwarding</div>
                <div style={detailValue}>
                  {(detail.attempts ?? []).length === 0 ? (
                    <span style={{ color: "#999" }}>
                      No forwarding attempts found.
                    </span>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {(detail.attempts ?? []).map(
                        (attempt: SubmissionAttempt, index: number) => (
                          <div key={attempt.id ?? index} style={attemptCard}>
                            <div style={attemptTop}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: "#1a1a1a",
                                }}
                              >
                                Attempt {attempt.attemptNo ?? index + 1}
                              </div>

                              <span style={attemptStatus(attempt.status)}>
                                {attempt.status ?? "unknown"}
                              </span>
                            </div>

                            <div style={{ fontSize: 12, color: "#777" }}>
                              <strong>HTTP:</strong>{" "}
                              {attempt.responseStatusCode ??
                                attempt.responseStatus ??
                                "-"}
                            </div>

                            <div style={{ fontSize: 12, color: "#777" }}>
                              <strong>Target ID:</strong>{" "}
                              {attempt.targetId ?? "-"}
                            </div>

                            <div style={{ fontSize: 12, color: "#777" }}>
                              <strong>Time:</strong>{" "}
                              {formatDateTime(
                                attempt.attemptedAt ?? attempt.createdAt,
                              )}
                            </div>

                            {attempt.errorMessage && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#dc2626",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                }}
                              >
                                {attempt.errorMessage}
                              </div>
                            )}

                            {attempt.responseBody !== undefined &&
                              attempt.responseBody !== null && (
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "#fff",
                                    border: "1px solid #eee",
                                    fontSize: 11,
                                    color: "#555",
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {typeof attempt.responseBody === "string"
                                    ? attempt.responseBody
                                    : JSON.stringify(
                                        attempt.responseBody,
                                        null,
                                        2,
                                      )}
                                </pre>
                              )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div style={detailLabel}>Events</div>
                <div style={detailValue}>
                  {(detail.events ?? []).length === 0 ? (
                    <span style={{ color: "#999" }}>No events found.</span>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(detail.events ?? []).map(
                        (event: SubmissionEvent, index: number) => (
                          <div
                            key={event.id ?? index}
                            style={{
                              padding: "9px 11px",
                              border: "1px solid #eee",
                              borderRadius: 10,
                              background: "#fafafa",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: "#1a1a1a",
                                marginBottom: 4,
                              }}
                            >
                              {event.eventType ?? "event"}
                            </div>

                            {event.message && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#555",
                                  marginBottom: 4,
                                }}
                              >
                                {event.message}
                              </div>
                            )}

                            <div style={{ fontSize: 11, color: "#999" }}>
                              {formatDateTime(event.createdAt)}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}