import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { formApi, responseApi } from "../api.ts";
import type { DashboardStats, TrendPoint, ActivityItem } from "../api.ts";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

const EMPTY_STATS: DashboardStats = {
  totalForms: 0,
  totalSubmissions: 0,
  published: 0,
  draft: 0,
  trend: [],
  recentActivity: [],
};

interface StatDef {
  label: string;
  key: keyof Pick<
    DashboardStats,
    "totalForms" | "totalSubmissions" | "published" | "draft"
  >;
  badge: string;
  positive: boolean;
  accent: string;
}

const STAT_DEFS: StatDef[] = [
  {
    label: "Total Forms",
    key: "totalForms",
    badge: "Live data",
    positive: true,
    accent: PURPLE,
  },
  {
    label: "Submissions",
    key: "totalSubmissions",
    badge: "Live data",
    positive: true,
    accent: "linear-gradient(135deg,#43e97b,#38f9d7)",
  },
  {
    label: "Published",
    key: "published",
    badge: "Live data",
    positive: true,
    accent: "linear-gradient(135deg,#f093fb,#f5576c)",
  },
  {
    label: "Draft",
    key: "draft",
    badge: "Live data",
    positive: false,
    accent: "linear-gradient(135deg,#fda085,#f6d365)",
  },
];

export default function Dashboard(): ReactElement {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("Last 7 days");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRealStats() {
      try {
        setLoading(true);
        setLoadError("");

        const forms = await formApi.list();
        const responses = await responseApi.list();

        const totalForms = forms.length;
        const totalSubmissions = responses.length;

        const published = forms.filter(
          (f) => f.status === "published" || f.status === "active",
        ).length;

        const draft = forms.filter((f) => f.status === "draft").length;

        const recentActivity: ActivityItem[] = responses
          .slice(0, 5)
          .map((r) => ({
            form: r.formTitle,
            event: "Submission received",
            time: r.submittedAt,
            color: "#22c55e",
          }));

        const now = new Date();
        const daysBack = period === "Last 30 days" ? 30 : 7;

        const dayMap = new Map<string, number>();

        for (let i = daysBack - 1; i >= 0; i -= 1) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);

          const key = date.toISOString().slice(0, 10);
          dayMap.set(key, 0);
        }

        responses.forEach((r) => {
          const submittedDate = new Date(r.submittedAt);
          const key = submittedDate.toISOString().slice(0, 10);

          if (dayMap.has(key)) {
            dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
          }
        });

        const trend: TrendPoint[] = Array.from(dayMap.entries()).map(
          ([key, val]) => {
            const date = new Date(key);

            return {
              label:
                daysBack === 7
                  ? date.toLocaleDateString("en-US", { weekday: "short" })
                  : `${date.getMonth() + 1}/${date.getDate()}`,
              val,
            };
          },
        );

        const realStats: DashboardStats = {
          totalForms,
          totalSubmissions,
          published,
          draft,
          trend,
          recentActivity,
        };

        if (!cancelled) setStats(realStats);
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setLoadError(
            "Could not load dashboard data. Please make sure the backend is running.",
          );
          setStats(EMPTY_STATS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRealStats();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const d = stats;
  const maxBar = Math.max(1, ...d.trend.map((t: TrendPoint) => t.val));

  const root: React.CSSProperties = {
    padding: "32px 40px",
    background: "#f5f5f7",
    minHeight: "calc(100vh - 56px)",
  };

  const statsGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 16,
    marginBottom: 28,
  };

  const mainGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 20,
  };

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #ebebeb",
    borderRadius: 16,
    padding: 24,
    overflow: "hidden",
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 4,
  };

  const cardSub: React.CSSProperties = {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 20,
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 10,
  };

  const statNumStyle: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 800,
    color: "#1a1a1a",
    lineHeight: 1,
    marginBottom: 8,
  };

  const barWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    height: 160,
    padding: "0 4px",
  };

  const barColStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flex: 1,
  };

  const actItem: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #f5f5f5",
  };

  const viewAllBtn: React.CSSProperties = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1.5px solid #ebebeb",
    background: "transparent",
    color: "#667eea",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 16,
  };

  const skBase: React.CSSProperties = {
    background: "#f0f0f0",
    borderRadius: 8,
  };

  const statCard = (): React.CSSProperties => ({
    background: "#fff",
    border: "1px solid #ebebeb",
    borderRadius: 16,
    padding: "24px 24px 20px",
    position: "relative",
    overflow: "hidden",
  });

  const statAccent = (color: string): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: color,
    borderRadius: "16px 16px 0 0",
  });

  const statBadge = (positive: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: positive ? "#edfcf2" : "#fef2f2",
    color: positive ? "#22c55e" : "#ef4444",
  });

  const periodBtn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "inherit",
    borderColor: active ? "#667eea" : "#e5e5e5",
    background: active ? "#eef0fd" : "transparent",
    color: active ? "#667eea" : "#888",
  });

  const actDot = (color: string): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  });

  if (loading) {
    return (
      <div style={root}>
        <div style={statsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...skBase,
                height: 120,
                borderRadius: 16,
              }}
            />
          ))}
        </div>
        <div style={{ ...skBase, height: 280, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div style={root}>
      {loadError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {loadError}
        </div>
      )}

      <div style={statsGrid}>
        {STAT_DEFS.map((c: StatDef) => (
          <div key={c.label} style={statCard()}>
            <div style={statAccent(c.accent)} />
            <div style={statLabelStyle}>{c.label}</div>
            <div style={statNumStyle}>{d[c.key]}</div>
            <div style={statBadge(c.positive)}>
              {c.positive ? "↑" : "↓"} {c.badge}
            </div>
          </div>
        ))}
      </div>

      <div style={mainGrid}>
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={cardTitle}>Submission Trends</div>
              <div style={cardSub}>
                {period === "Last 7 days"
                  ? "Daily form responses for the last 7 days"
                  : "Daily form responses for the last 30 days"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {["Last 7 days", "Last 30 days"].map((p: string) => (
                <button
                  key={p}
                  type="button"
                  style={periodBtn(period === p)}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={barWrap}>
            {d.trend.map((item: TrendPoint, i: number) => (
              <div key={i} style={barColStyle}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#bbb",
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  {item.val}
                </div>

                <div
                  style={{
                    width: "100%",
                    height: Math.max(4, (item.val / maxBar) * 130),
                    background:
                      item.val === maxBar && item.val > 0
                        ? PURPLE
                        : "#eef0fd",
                    borderRadius: "6px 6px 0 0",
                    minHeight: 4,
                  }}
                />

                <div
                  style={{
                    fontSize: 11,
                    color: "#bbb",
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={cardTitle}>Recent Activity</div>
          <div style={cardSub}>Latest events across your forms</div>

          {d.recentActivity.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                fontSize: 13,
                color: "#aaa",
                textAlign: "center",
              }}
            >
              No recent activity yet
            </div>
          ) : (
            d.recentActivity.map((a: ActivityItem, i: number) => (
              <div key={i} style={actItem}>
                <div style={actDot(a.color)} />

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1a1a1a",
                    }}
                  >
                    {a.form}
                  </div>

                  <div style={{ fontSize: 12, color: "#aaa" }}>{a.event}</div>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#ccc",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.time}
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            style={viewAllBtn}
            onClick={() => navigate("/responses")}
          >
            View all activity →
          </button>
        </div>
      </div>
    </div>
  );
}