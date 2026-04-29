import { useEffect, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { useParams } from "react-router-dom";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

type FieldOption =
  | string
  | {
      label?: string;
      value?: string | number | boolean;
    };

interface BackendField {
  id?: string;
  fieldKey?: string;
  key?: string;
  type: string;
  label: string;
  placeholder?: string | null;
  required?: boolean;
  optionsJson?: FieldOption[] | string | null;
  options?: FieldOption[] | string | null;
}

interface PublicField {
  id: string;
  fieldKey: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

interface PublicFormData {
  id: string;
  slug: string;
  version?: number;
  title: string;
  description: string;
  fields: PublicField[];
}

type AnswerValue = string | string[];

interface UploadInfo {
  fileName: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
}

function normalizeOptions(raw: BackendField["optionsJson"]): string[] {
  if (!raw) return [];

  let value: unknown = raw;

  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((option) => {
      if (typeof option === "string") return option;

      if (option && typeof option === "object") {
        const obj = option as { label?: unknown; value?: unknown };
        return String(obj.label ?? obj.value ?? "");
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeFieldType(type: string): string {
  if (type === "short") return "text";
  if (type === "long") return "textarea";
  if (type === "select") return "dropdown";
  return type;
}

function normalizeFormResponse(json: unknown): PublicFormData {
  const root = json as {
    data?: {
      formId?: string;
      slug?: string;
      version?: number;
      fields?: BackendField[];
      form?: {
        id?: string;
        slug?: string;
        currentVersion?: number;
        title?: string;
        description?: string | null;
        fields?: BackendField[];
      };
    };
    formId?: string;
    slug?: string;
    version?: number;
    title?: string;
    description?: string | null;
    fields?: BackendField[];
    form?: {
      id?: string;
      slug?: string;
      currentVersion?: number;
      title?: string;
      description?: string | null;
      fields?: BackendField[];
    };
  };

  const data = root.data ?? root;
  const form = data.form ?? root.form ?? data;

  const fieldsFromBackend: BackendField[] =
    data.fields ?? form.fields ?? root.fields ?? [];

  return {
    id: data.formId ?? form.id ?? root.formId ?? "",
    slug: data.slug ?? form.slug ?? root.slug ?? "",
    version: data.version ?? form.currentVersion ?? root.version,
    title: form.title || root.title || "Untitled Form",
    description: form.description || root.description || "",
    fields: fieldsFromBackend.map((field, index) => {
      const fieldKey =
        field.fieldKey ?? field.key ?? field.id ?? `field_${index + 1}`;

      return {
        id: field.id ?? fieldKey,
        fieldKey,
        type: normalizeFieldType(field.type),
        label: field.label || "Untitled Question",
        placeholder: field.placeholder || "",
        required: Boolean(field.required),
        options: normalizeOptions(field.optionsJson ?? field.options),
      };
    }),
  };
}

export default function PublicForm(): ReactElement {
  const { slug } = useParams<{ slug: string }>();

  const [form, setForm] = useState<PublicFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, UploadInfo>
  >({});

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setNotFound(false);
    setError("");

    fetch(`/api/public/forms/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Form not found");

        const json = await res.json();
        return normalizeFormResponse(json);
      })
      .then((data) => {
        setForm(data);
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const handleAnswer = (fieldKey: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const uploadFile = async (
    fieldKey: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setUploadingField(fieldKey);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/public/uploads", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          json?.error?.message || json?.message || "Failed to upload file.",
        );
      }

      const uploaded = json.data as UploadInfo;

      setUploadedFiles((prev) => ({
        ...prev,
        [fieldKey]: uploaded,
      }));

      handleAnswer(fieldKey, uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file.");
      handleAnswer(fieldKey, "");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async () => {
    if (!form || !slug) return;

    const missing = form.fields.filter((field) => {
      const value = answers[field.fieldKey];

      if (!field.required) return false;
      if (Array.isArray(value)) return value.length === 0;
      return !value || value.trim() === "";
    });

    if (missing.length > 0) {
      setError(
        `Please fill in: ${missing.map((field) => field.label).join(", ")}`,
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/forms/${slug}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formVersion: form.version,
          sourceUrl: window.location.href,
          values: answers,
          meta: {
            source: "hosted-public-form",
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.error?.message ||
            json?.message ||
            "Failed to submit. Please try again.",
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pInput: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    background: "#fff",
    color: "#1a1a1a",
    boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "#aaa",
        }}
      >
        Loading form…
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system,sans-serif",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
          Form not found
        </div>
        <div style={{ fontSize: 13, color: "#aaa" }}>
          This form may have been removed or is no longer active.
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f5f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system,sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "60px 48px",
            textAlign: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            maxWidth: 440,
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: 8,
            }}
          >
            Thank you!
          </h2>
          <p style={{ color: "#888", marginBottom: 0 }}>
            Your response has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e5e5",
          padding: "0 24px",
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: PURPLE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          F
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
          Form Builder by Thai.run
        </span>
      </div>

      <div style={{ maxWidth: 640, margin: "32px auto", padding: "0 16px" }}>
        <div
          style={{
            background: PURPLE,
            borderRadius: "16px 16px 0 0",
            padding: "32px 36px",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#fff",
              margin: 0,
              marginBottom: 6,
            }}
          >
            {form?.title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              margin: 0,
            }}
          >
            {form?.description}
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "0 0 16px 16px",
            padding: "32px 36px",
            border: "1px solid #e5e5e5",
            borderTop: "none",
          }}
        >
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#ef4444",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          {form?.fields.map((field) => (
            <div key={field.id} style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                {field.label}
                {field.required && (
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                )}
              </label>

              {(field.type === "text" ||
                field.type === "email" ||
                field.type === "phone") && (
                <input
                  type={
                    field.type === "email"
                      ? "email"
                      : field.type === "phone"
                        ? "tel"
                        : "text"
                  }
                  style={pInput}
                  placeholder={field.placeholder || "Your answer"}
                  value={(answers[field.fieldKey] as string) ?? ""}
                  onChange={(event) =>
                    handleAnswer(field.fieldKey, event.target.value)
                  }
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  style={{ ...pInput, minHeight: 100, resize: "vertical" }}
                  placeholder={field.placeholder || "Your answer"}
                  value={(answers[field.fieldKey] as string) ?? ""}
                  onChange={(event) =>
                    handleAnswer(field.fieldKey, event.target.value)
                  }
                />
              )}

              {(field.type === "select" || field.type === "dropdown") && (
                <select
                  style={pInput}
                  value={(answers[field.fieldKey] as string) ?? ""}
                  onChange={(event) =>
                    handleAnswer(field.fieldKey, event.target.value)
                  }
                >
                  <option value="">Select an option</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "radio" &&
                field.options.map((option) => (
                  <label
                    key={option}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="radio"
                      name={`field-${field.id}`}
                      value={option}
                      checked={(answers[field.fieldKey] as string) === option}
                      onChange={() => handleAnswer(field.fieldKey, option)}
                      style={{
                        accentColor: "#667eea",
                        width: 16,
                        height: 16,
                      }}
                    />
                    {option}
                  </label>
                ))}

              {field.type === "checkbox" &&
                field.options.map((option) => {
                  const current = Array.isArray(answers[field.fieldKey])
                    ? (answers[field.fieldKey] as string[])
                    : [];

                  const checked = current.includes(option);

                  return (
                    <label
                      key={option}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          handleAnswer(
                            field.fieldKey,
                            checked
                              ? current.filter((value) => value !== option)
                              : [...current, option],
                          );
                        }}
                        style={{
                          accentColor: "#667eea",
                          width: 16,
                          height: 16,
                        }}
                      />
                      {option}
                    </label>
                  );
                })}

              {field.type === "date" && (
                <input
                  type="date"
                  style={pInput}
                  value={(answers[field.fieldKey] as string) ?? ""}
                  onChange={(event) =>
                    handleAnswer(field.fieldKey, event.target.value)
                  }
                />
              )}

              {field.type === "time" && (
                <input
                  type="time"
                  style={pInput}
                  value={(answers[field.fieldKey] as string) ?? ""}
                  onChange={(event) =>
                    handleAnswer(field.fieldKey, event.target.value)
                  }
                />
              )}

              {field.type === "file" && (
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                    onChange={(event) => void uploadFile(field.fieldKey, event)}
                    style={{
                      ...pInput,
                      padding: 9,
                    }}
                  />

                  <div
                    style={{
                      fontSize: 12,
                      color: "#999",
                      marginTop: 6,
                    }}
                  >
                    PNG, JPG, WEBP, GIF, or PDF. Max 5MB.
                  </div>

                  {uploadingField === field.fieldKey && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#667eea",
                        marginTop: 6,
                        fontWeight: 600,
                      }}
                    >
                      Uploading…
                    </div>
                  )}

                  {uploadedFiles[field.fieldKey] && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#ecfdf5",
                        color: "#16a34a",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Uploaded:{" "}
                      <a
                        href={`/api${uploadedFiles[field.fieldKey].url}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#16a34a" }}
                      >
                        {uploadedFiles[field.fieldKey].originalName}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <button
              type="button"
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: PURPLE,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  submitting || Boolean(uploadingField) ? "not-allowed" : "pointer",
                opacity: submitting || Boolean(uploadingField) ? 0.7 : 1,
              }}
              onClick={() => void handleSubmit()}
              disabled={submitting || Boolean(uploadingField)}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}