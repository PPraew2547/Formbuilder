/* ─────────────────────────────────────────────────────────────────────────
   src/api.ts
   Adapted to work with your backend while keeping the frontend design intact.
───────────────────────────────────────────────────────────────────────── */

export const BASE_URL: string =
  (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? "";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("fb_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: { message?: string };
    };

    throw new Error(err.error?.message ?? err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/* ── Shared frontend types ── */

export type FormStatus = "published" | "draft" | "archived";

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  order: number;
}

export interface FormSummary {
  id: string;
  title: string;
  description: string;
  status: FormStatus;
  responses: number;
  updatedAt: string;
  fields: FormField[];
  slug?: string;
}

export interface FormTarget {
  id: string;
  formId: string;
  targetType: "webhook" | "internal_api" | "queue" | "email";
  httpMethod: "POST" | "PUT" | "PATCH";
  targetUrl: string;
  headers: Record<string, string>;
  mapping: {
    fieldMap?: Record<string, string>;
    staticValues?: Record<string, unknown>;
  };
  isActive: boolean;
  priority: number;
}

export interface FormRoute {
  id: string;
  formId: string;
  siteId?: string | null;
  matchType: "exact" | "prefix" | "contains" | "regex";
  urlPattern: string;
  priority: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface ResponseAnswer {
  key: string;
  label: string;
  value: unknown;
}

export interface SubmissionAttempt {
  id?: string;
  submissionId?: string;
  targetId?: string | null;
  attemptNo?: number | null;
  status?: string | null;
  responseStatus?: number | null;
  responseStatusCode?: number | null;
  responseBody?: unknown;
  errorMessage?: string | null;
  attemptedAt?: string | null;
  createdAt?: string | null;
}

export interface SubmissionEvent {
  id?: string;
  submissionId?: string;
  eventType?: string | null;
  message?: string | null;
  metaJson?: unknown;
  metadataJson?: unknown;
  createdAt?: string | null;
}

export interface ResponseItem {
  id: string;
  formId: string;
  formTitle: string;
  respondent: string;
  submittedAt: string;
  status: "new" | "reviewed" | "archived";
  entries: number;
  payload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown> | null;
  forwardStatus?: string;
  retryCount?: number;
  sourceUrl?: string | null;
  answers?: ResponseAnswer[];
  attempts?: SubmissionAttempt[];
  events?: SubmissionEvent[];
}

export interface TrendPoint {
  label: string;
  val: number;
}

export interface ActivityItem {
  form: string;
  event: string;
  time: string;
  color: string;
}

export interface DashboardStats {
  totalForms: number;
  totalSubmissions: number;
  published: number;
  draft: number;
  trend: TrendPoint[];
  recentActivity: ActivityItem[];
}

/* ── Backend shapes ── */

interface BackendField {
  id?: string;
  fieldKey?: string;
  label?: string;
  type?: string;
  placeholder?: string | null;
  required?: boolean;
  optionsJson?: unknown;
  sortOrder?: number;
}

interface BackendForm {
  id: string;
  name: string;
  slug: string;
  status: string;
  currentVersion?: number | null;
  title: string;
  description?: string | null;
  locale?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  fields?: BackendField[];
}

interface BackendTarget {
  id: string;
  formId?: string;
  form_id?: string;
  targetType?: string;
  target_type?: string;
  httpMethod?: string;
  http_method?: string;
  targetUrl?: string;
  target_url?: string;
  headersJson?: Record<string, string> | null;
  headers_json?: Record<string, string> | null;
  mappingJson?: FormTarget["mapping"] | null;
  mapping_json?: FormTarget["mapping"] | null;
  isActive?: boolean;
  is_active?: boolean;
  priority?: number;
}

interface BackendRoute {
  id: string;
  formId?: string;
  form_id?: string;
  siteId?: string | null;
  site_id?: string | null;
  matchType?: string;
  match_type?: string;
  urlPattern?: string;
  url_pattern?: string;
  priority?: number;
  isActive?: boolean;
  is_active?: boolean;
  startAt?: string | null;
  start_at?: string | null;
  endAt?: string | null;
  end_at?: string | null;
}

interface BackendSubmission {
  id: string;
  formId: string;
  formVersionId: string;
  status: string;
  reviewStatus?: "new" | "reviewed" | "archived" | null;
  sourceType: string;
  sourceUrl: string | null;
  payloadJson?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  normalizedPayloadJson?: Record<string, unknown> | null;
  normalizedPayload?: Record<string, unknown> | null;
  forwardStatus: string;
  retryCount: number;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  attempts?: SubmissionAttempt[];
  events?: SubmissionEvent[];
}

type ApiWrapped<T> = {
  success: boolean;
  data: T;
};

function unwrap<T>(value: T | ApiWrapped<T>): T {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    "success" in value
  ) {
    return (value as ApiWrapped<T>).data;
  }

  return value as T;
}

/* ── Mapping helpers ── */

function mapForm(form: BackendForm, responses = 0): FormSummary {
  const status: FormStatus =
    form.status === "published" && form.isActive
      ? "published"
      : form.status === "archived"
        ? "archived"
        : "draft";

  return {
    id: form.id,
    title: form.title,
    description: form.description ?? "",
    status,
    responses,
    updatedAt: form.updatedAt ?? new Date().toISOString(),
    fields: (form.fields ?? []).map((field, index) => ({
      id: field.id ?? field.fieldKey ?? `field-${index}`,
      type: field.type ?? "text",
      label: field.label ?? "Untitled Question",
      placeholder: field.placeholder ?? "",
      required: Boolean(field.required),
      options: Array.isArray(field.optionsJson)
        ? field.optionsJson.map(String)
        : [],
      order: field.sortOrder ?? index,
    })),
    slug: form.slug,
  };
}

function mapTarget(target: BackendTarget): FormTarget {
  return {
    id: target.id,
    formId: target.formId ?? target.form_id ?? "",
    targetType: (target.targetType ??
      target.target_type ??
      "webhook") as FormTarget["targetType"],
    httpMethod: (target.httpMethod ??
      target.http_method ??
      "POST") as FormTarget["httpMethod"],
    targetUrl: target.targetUrl ?? target.target_url ?? "",
    headers: target.headersJson ?? target.headers_json ?? {},
    mapping: target.mappingJson ?? target.mapping_json ?? {
      fieldMap: {},
      staticValues: {},
    },
    isActive: target.isActive ?? target.is_active ?? true,
    priority: target.priority ?? 1,
  };
}

function mapRoute(route: BackendRoute): FormRoute {
  return {
    id: route.id,
    formId: route.formId ?? route.form_id ?? "",
    siteId: route.siteId ?? route.site_id ?? null,
    matchType: (route.matchType ??
      route.match_type ??
      "exact") as FormRoute["matchType"],
    urlPattern: route.urlPattern ?? route.url_pattern ?? "",
    priority: route.priority ?? 1,
    isActive: route.isActive ?? route.is_active ?? true,
    startAt: route.startAt ?? route.start_at ?? null,
    endAt: route.endAt ?? route.end_at ?? null,
  };
}

function buildAnswersWithLabels(
  payload: Record<string, unknown>,
  fields: BackendField[],
): ResponseAnswer[] {
  return Object.entries(payload).map(([key, value]) => {
    const field = fields.find((f) => f.fieldKey === key || f.id === key);

    return {
      key,
      label: field?.label || key,
      value,
    };
  });
}

function mapSubmissionToResponseItem(
  item: BackendSubmission,
  formTitle = "Form",
  fields: BackendField[] = [],
): ResponseItem {
  const payload = item.payloadJson ?? item.payload ?? {};
  const normalizedPayload =
    item.normalizedPayloadJson ?? item.normalizedPayload ?? null;

  const respondent =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.name === "string"
        ? payload.name
        : typeof payload.fullName === "string"
          ? payload.fullName
          : "Unknown";

  return {
    id: item.id,
    formId: item.formId,
    formTitle,
    respondent,
    submittedAt: item.submittedAt ?? item.createdAt,
    status:
      item.reviewStatus === "reviewed" || item.reviewStatus === "archived"
        ? item.reviewStatus
        : "new",
    entries: Object.keys(payload).length,
    payload,
    normalizedPayload,
    forwardStatus: item.forwardStatus,
    retryCount: item.retryCount,
    sourceUrl: item.sourceUrl,
    answers: buildAnswersWithLabels(payload, fields),
    attempts: item.attempts ?? [],
    events: item.events ?? [],
  };
}

async function getFieldsForForm(form?: BackendForm): Promise<BackendField[]> {
  if (!form) return [];

  let fields: BackendField[] = form.fields ?? [];

  try {
    const formDetailRaw = await api.get<BackendForm | ApiWrapped<BackendForm>>(
      `/admin/forms/${form.id}`,
    );

    const formDetail = unwrap(formDetailRaw);
    fields = formDetail.fields ?? fields;
  } catch {
    // keep going
  }

  if (fields.length === 0 && form.slug) {
    try {
      const publicForm = await api.get<{
        success: boolean;
        data: {
          formId: string;
          slug: string;
          version?: number;
          form?: BackendForm;
          fields?: BackendField[];
        };
      }>(`/public/forms/${form.slug}`);

      fields =
        publicForm.data.fields ??
        publicForm.data.form?.fields ??
        fields;
    } catch {
      // keep going
    }
  }

  return fields;
}

/* ── Form API ── */

export const formApi = {
  async list(): Promise<FormSummary[]> {
    const rows = await api.get<BackendForm[]>("/admin/forms");
    return rows.map((f) => mapForm(f));
  },

  async get(id: string): Promise<FormSummary> {
    const raw = await api.get<BackendForm | ApiWrapped<BackendForm>>(
      `/admin/forms/${id}`,
    );

    const row = unwrap(raw);
    return mapForm(row);
  },

  async create(body: Partial<FormSummary>): Promise<FormSummary> {
    const shouldPublish = body.status === "published";

    const row = await api.post<BackendForm>("/admin/forms", {
      name: body.title ?? "Untitled Form",
      slug: body.slug ?? `form-${Date.now()}`,
      status: shouldPublish ? "published" : "draft",
      title: body.title ?? "Untitled Form",
      description: body.description ?? "",
      locale: "en",
      isActive: shouldPublish,
    });

    return mapForm(row);
  },

  async update(id: string, body: Partial<FormSummary>): Promise<FormSummary> {
    const shouldPublish = body.status === "published";

    const row = await api.put<BackendForm>(`/admin/forms/${id}`, {
      name: body.title ?? "Untitled Form",
      title: body.title ?? "Untitled Form",
      description: body.description ?? "",
      locale: "en",
      status: shouldPublish ? "published" : "draft",
      isActive: shouldPublish,
    });

    return mapForm(row);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/forms/${id}`);
  },

  async getPublishedVersion(id: string) {
    return api.get(`/admin/forms/${id}/versions/published`);
  },

  async createField(formId: string, field: unknown) {
    return api.post(`/admin/forms/${formId}/fields`, field);
  },

  async updateField(fieldId: string, field: unknown) {
    return api.put(`/admin/fields/${fieldId}`, field);
  },

  async reorderFields(
    formId: string,
    fieldOrders: { fieldId: string; sortOrder: number }[],
  ) {
    return api.post(`/admin/forms/${formId}/fields/reorder`, { fieldOrders });
  },

  async publish(id: string): Promise<FormSummary> {
    await api.post(`/admin/forms/${id}/versions/publish`, {});
    const row = await api.get<BackendForm>(`/admin/forms/${id}`);
    return mapForm(row);
  },
};

/* ── Target API ── */

export const targetApi = {
  async list(formId: string): Promise<FormTarget[]> {
    const res = await api.get<
      BackendTarget[] | { success: boolean; data: BackendTarget[] }
    >(`/admin/forms/${formId}/targets`);

    const data = Array.isArray(res) ? res : res.data;
    return data.map(mapTarget);
  },

  async create(
    formId: string,
    target: Omit<FormTarget, "id" | "formId">,
  ): Promise<FormTarget> {
    const res = await api.post<
      BackendTarget | { success: boolean; data: BackendTarget }
    >(`/admin/forms/${formId}/targets`, {
      targetType: target.targetType,
      httpMethod: target.httpMethod,
      targetUrl: target.targetUrl,
      headers: target.headers,
      mapping: target.mapping,
      isActive: target.isActive,
      priority: target.priority,
    });

    const data = "data" in res ? res.data : res;
    return mapTarget(data);
  },

  async update(
    targetId: string,
    target: Partial<Omit<FormTarget, "id" | "formId">>,
  ): Promise<FormTarget> {
    const res = await api.put<
      BackendTarget | { success: boolean; data: BackendTarget }
    >(`/admin/targets/${targetId}`, {
      targetType: target.targetType,
      httpMethod: target.httpMethod,
      targetUrl: target.targetUrl,
      headers: target.headers,
      mapping: target.mapping,
      isActive: target.isActive,
      priority: target.priority,
    });

    const data = "data" in res ? res.data : res;
    return mapTarget(data);
  },

  async delete(targetId: string): Promise<void> {
    await api.delete(`/admin/targets/${targetId}`);
  },
};

/* ── Route API ── */

export const routeApi = {
  async list(formId: string): Promise<FormRoute[]> {
    const res = await api.get<
      BackendRoute[] | { success: boolean; data: BackendRoute[] }
    >(`/admin/forms/${formId}/routes`);

    const data = Array.isArray(res) ? res : res.data;
    return data.map(mapRoute);
  },

  async create(
    formId: string,
    route: Omit<FormRoute, "id" | "formId">,
  ): Promise<FormRoute> {
    const res = await api.post<
      BackendRoute | { success: boolean; data: BackendRoute }
    >(`/admin/forms/${formId}/routes`, {
      siteId: route.siteId ?? null,
      matchType: route.matchType,
      urlPattern: route.urlPattern,
      priority: route.priority,
      isActive: route.isActive,
      startAt: route.startAt ?? null,
      endAt: route.endAt ?? null,
    });

    const data = "data" in res ? res.data : res;
    return mapRoute(data);
  },

  async update(
    routeId: string,
    route: Partial<Omit<FormRoute, "id" | "formId">>,
  ): Promise<FormRoute> {
    const res = await api.put<
      BackendRoute | { success: boolean; data: BackendRoute }
    >(`/admin/routes/${routeId}`, {
      siteId: route.siteId ?? null,
      matchType: route.matchType ?? "exact",
      urlPattern: route.urlPattern ?? "",
      priority: route.priority ?? 1,
      isActive: route.isActive ?? true,
      startAt: route.startAt ?? null,
      endAt: route.endAt ?? null,
    });

    const data = "data" in res ? res.data : res;
    return mapRoute(data);
  },
};

/* ── Response API ── */

export const responseApi = {
  async list(formId?: string): Promise<ResponseItem[]> {
    if (formId) {
      const forms = await api.get<BackendForm[]>("/admin/forms");
      const form = forms.find((f) => f.id === formId);
      const fields = await getFieldsForForm(form);

      const res = await api.get<{ success: boolean; data: BackendSubmission[] }>(
        `/admin/forms/${formId}/submissions`,
      );

      return res.data.map((item) =>
        mapSubmissionToResponseItem(item, form?.title ?? "Form", fields),
      );
    }

    const forms = await api.get<BackendForm[]>("/admin/forms");
    const all: ResponseItem[] = [];

    for (const form of forms) {
      try {
        const fields = await getFieldsForForm(form);

        const res = await api.get<{
          success: boolean;
          data: BackendSubmission[];
        }>(`/admin/forms/${form.id}/submissions`);

        all.push(
          ...res.data.map((item) =>
            mapSubmissionToResponseItem(item, form.title, fields),
          ),
        );
      } catch {
        // Ignore one form failing so the page still loads.
      }
    }

    return all.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime(),
    );
  },

  async get(id: string): Promise<ResponseItem> {
    const detail = await api.get<{ success: boolean; data: BackendSubmission }>(
      `/admin/submissions/${id}`,
    );

    const forms = await api.get<BackendForm[]>("/admin/forms");
    const form = forms.find((f) => f.id === detail.data.formId);
    const fields = await getFieldsForForm(form);

    return mapSubmissionToResponseItem(
      detail.data,
      form?.title ?? "Form",
      fields,
    );
  },

  async update(id: string, body: Partial<ResponseItem>): Promise<ResponseItem> {
    const res = await api.put<{ success: boolean; data: BackendSubmission }>(
      `/admin/submissions/${id}/review-status`,
      {
        reviewStatus: body.status ?? "new",
      },
    );

    const forms = await api.get<BackendForm[]>("/admin/forms");
    const form = forms.find((f) => f.id === res.data.formId);
    const fields = await getFieldsForForm(form);

    return mapSubmissionToResponseItem(
      res.data,
      form?.title ?? "Form",
      fields,
    );
  },

  async delete(_id: string): Promise<void> {
    return;
  },
};

/* ── Dashboard API ── */

export const dashboardApi = {
  async stats(): Promise<DashboardStats> {
    const forms = await api.get<BackendForm[]>("/admin/forms");

    let totalSubmissions = 0;
    const recentActivity: ActivityItem[] = [];
    const allSubmissions: BackendSubmission[] = [];

    for (const form of forms) {
      try {
        const res = await api.get<{ success: boolean; data: BackendSubmission[] }>(
          `/admin/forms/${form.id}/submissions`,
        );

        totalSubmissions += res.data.length;
        allSubmissions.push(...res.data);

        res.data.slice(0, 3).forEach((item) => {
          recentActivity.push({
            form: form.title,
            event:
              item.status === "failed"
                ? "Submission failed"
                : "Submission received",
            time: item.submittedAt ?? item.createdAt,
            color: item.status === "failed" ? "#ef4444" : "#22c55e",
          });
        });
      } catch {
        // Ignore one form failing.
      }
    }

    const now = new Date();
    const dayMap = new Map<string, number>();

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, 0);
    }

    allSubmissions.forEach((item) => {
      const date = new Date(item.submittedAt ?? item.createdAt);
      const key = date.toISOString().slice(0, 10);

      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
    });

    const trend: TrendPoint[] = Array.from(dayMap.entries()).map(
      ([key, val]) => {
        const date = new Date(key);

        return {
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
          val,
        };
      },
    );

    return {
      totalForms: forms.length,
      totalSubmissions,
      published: forms.filter(
        (f) => f.status === "published" && f.isActive,
      ).length,
      draft: forms.filter(
        (f) => f.status === "draft" || !f.isActive,
      ).length,
      trend,
      recentActivity: recentActivity
        .sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        )
        .slice(0, 6),
    };
  },
};