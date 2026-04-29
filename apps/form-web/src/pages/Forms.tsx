import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { formApi, api } from "../api.ts";
import type { FormSummary } from "../api.ts";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";
const PER_PAGE = 10;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);

  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

function normalizeStatus(status: string): "published" | "draft" | "archived" {
  if (status === "active" || status === "published") return "published";
  if (status === "archived") return "archived";
  return "draft";
}

function statusLabel(status: string): string {
  const normalized = normalizeStatus(status);

  if (normalized === "published") return "Published";
  if (normalized === "archived") return "Archived";
  return "Draft";
}

export default function Forms(): ReactElement {
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const data: FormSummary[] = await formApi.list();

      const withResponses = await Promise.all(
        data.map(async (form: FormSummary) => {
          try {
            const res = await api.get<{ success: boolean; data: unknown[] }>(
              `/admin/forms/${form.id}/submissions`,
            );

            return {
              ...form,
              responses: Array.isArray(res.data) ? res.data.length : 0,
            };
          } catch {
            return {
              ...form,
              responses: 0,
            };
          }
        }),
      );

      setForms(withResponses);
    } catch (err) {
      console.error(err);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this form?")) return;

    setDeleting(id);

    try {
      await formApi.delete(id);
    } catch (err) {
      console.error(err);
    }

    await load();
    setDeleting(null);
  };

  const handleToggleStatus = async (form: FormSummary) => {
    const current = normalizeStatus(form.status);
    const next = current === "published" ? "draft" : "published";

    try {
      const updated = await formApi.update(form.id, {
        title: form.title,
        description: form.description,
        status: next,
      } as Partial<FormSummary>);

      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id
            ? {
                ...f,
                ...updated,
                responses: f.responses,
              }
            : f,
        ),
      );
    } catch (err) {
      console.error(err);

      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id
            ? {
                ...f,
                status: next as FormSummary["status"],
              }
            : f,
        ),
      );
    }
  };

  const filtered = forms.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "13px 20px",
    background: "#fafafa",
    borderBottom: "1px solid #f0f0f0",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "14px 20px",
    fontSize: 13,
    color: "#1a1a1a",
    verticalAlign: "middle",
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

  const createBtn: React.CSSProperties = {
    padding: "9px 20px",
    borderRadius: 10,
    border: "none",
    background: PURPLE,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const editBtn: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 7,
    border: "1.5px solid #667eea",
    background: "transparent",
    color: "#667eea",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    marginRight: 6,
  };

  const delBtn: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 7,
    border: "1.5px solid #fca5a5",
    background: "#fef2f2",
    color: "#ef4444",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const skRow: React.CSSProperties = {
    padding: "14px 20px",
    display: "flex",
    gap: 20,
  };

  const skBase: React.CSSProperties = {
    background: "#f0f0f0",
    borderRadius: 6,
  };

  const pageBtn = (
    active: boolean,
    disabled?: boolean,
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

  const statusBadge = (status: string): React.CSSProperties => {
    const normalized = normalizeStatus(status);

    if (normalized === "published") {
      return {
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        cursor: "pointer",
        background: "#edfcf2",
        color: "#22c55e",
      };
    }

    if (normalized === "archived") {
      return {
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        cursor: "pointer",
        background: "#f5f5f5",
        color: "#999",
      };
    }

    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      textTransform: "capitalize",
      cursor: "pointer",
      background: "#fff7ed",
      color: "#f97316",
    };
  };

  return (
    <div style={root}>
      <div style={topRow}>
        <div style={{ fontSize: 13, color: "#999" }}>
          {filtered.length} form{filtered.length !== 1 ? "s" : ""}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
              placeholder="Search forms…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button style={createBtn} onClick={() => navigate("/builder")}>
            + Create Form
          </button>
        </div>
      </div>

      <div style={tableCard}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Form Name", "Last Updated", "Responses", "Status", "Action"].map(
                (h: string, i: number) => (
                  <th key={i} style={thStyle}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [0, 1, 2, 3].map((i: number) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <div style={skRow}>
                      {([200, 100, 40, 60, 120] as number[]).map(
                        (w: number, j: number) => (
                          <div
                            key={j}
                            style={{ ...skBase, height: 16, width: w }}
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
                  colSpan={5}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "#bbb",
                    padding: 48,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                  <div>No forms yet. Create your first form!</div>
                </td>
              </tr>
            ) : (
              paged.map((f: FormSummary) => (
                <tr key={f.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{f.title}</td>

                  <td style={{ ...tdStyle, color: "#888" }}>
                    {timeAgo(f.updatedAt)}
                  </td>

                  <td style={{ ...tdStyle, color: "#888" }}>{f.responses}</td>

                  <td style={tdStyle}>
                    <span
                      style={statusBadge(f.status)}
                      onClick={() => void handleToggleStatus(f)}
                      title="Click to toggle draft/published"
                    >
                      {statusLabel(f.status)}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <button
                      style={editBtn}
                      onClick={() => navigate(`/builder/${f.id}`)}
                    >
                      Edit
                    </button>

                    <button
                      style={delBtn}
                      disabled={deleting === f.id}
                      onClick={() => void handleDelete(f.id)}
                    >
                      {deleting === f.id ? "…" : "Delete"}
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
                  style={pageBtn(p === page)}
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
    </div>
  );
}