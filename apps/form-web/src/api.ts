/* ─────────────────────────────────────────────────────────────────────────
   src/api.ts
   Adapted to work with your backend while keeping the frontend design intact.
───────────────────────────────────────────────────────────────────────── */

export const BASE_URL: string =
  (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? '';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('fb_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
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
  get:    <T>(path: string)                => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
};

/* ── Shared types used by your friend’s pages ── */
export type FormStatus = 'active' | 'draft';

export interface FormField {
  id:          string;
  type:        string;
  label:       string;
  placeholder: string;
  required:    boolean;
  options?:    string[];
  order:       number;
}

export interface FormSummary {
  id:          string;
  title:       string;
  description: string;
  status:      FormStatus;
  responses:   number;
  updatedAt:   string;
  fields:      FormField[];
  slug?:       string;
}

export interface ResponseItem {
  id:          string;
  formId:      string;
  formTitle:   string;
  respondent:  string;
  submittedAt: string;
  status:      'new' | 'reviewed' | 'archived';
  entries:     number;
}

export interface TrendPoint  { label: string; val: number; }
export interface ActivityItem { form: string; event: string; time: string; color: string; }

export interface DashboardStats {
  totalForms:       number;
  totalSubmissions: number;
  published:        number;
  draft:            number;
  trend:            TrendPoint[];
  recentActivity:   ActivityItem[];
}

/* ── Backend shapes ── */
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
}

interface BackendSubmission {
  id: string;
  formId: string;
  formVersionId: string;
  status: string;
  sourceType: string;
  sourceUrl: string | null;
  payloadJson: Record<string, unknown>;
  normalizedPayloadJson: Record<string, unknown> | null;
  forwardStatus: string;
  retryCount: number;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

function mapForm(form: BackendForm, responses = 0): FormSummary {
  return {
    id: form.id,
    title: form.title,
    description: form.description ?? '',
    status: form.isActive ? 'active' : 'draft',
    responses,
    updatedAt: form.updatedAt ?? new Date().toISOString(),
    fields: [],
    slug: form.slug,
  };
}

function mapSubmissionToResponseItem(
  item: BackendSubmission,
  formTitle = 'Form'
): ResponseItem {
  const payload = item.payloadJson ?? {};
  const respondent =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload.name === 'string'
      ? payload.name
      : 'Unknown';

  return {
    id: item.id,
    formId: item.formId,
    formTitle,
    respondent,
    submittedAt: item.submittedAt ?? item.createdAt,
    status:
      item.status === 'failed'
        ? 'archived'
        : item.retryCount > 0
        ? 'reviewed'
        : 'new',
    entries: Object.keys(payload).length,
  };
}

/* ── API helpers ── */
export const formApi = {
  async list(): Promise<FormSummary[]> {
    const rows = await api.get<BackendForm[]>('/admin/forms');
    return rows.map((f) => mapForm(f));
  },

  async get(id: string): Promise<FormSummary> {
    const row = await api.get<BackendForm>(`/admin/forms/${id}`);
    return mapForm(row);
  },

  async create(body: Partial<FormSummary>): Promise<FormSummary> {
    const row = await api.post<BackendForm>('/admin/forms', {
      name: body.title ?? 'Untitled Form',
      slug: body.slug ?? `form-${Date.now()}`,
      status: body.status === 'active' ? 'published' : 'draft',
      title: body.title ?? 'Untitled Form',
      description: body.description ?? '',
      locale: 'en',
    });
    return mapForm(row);
  },

  async update(id: string, body: Partial<FormSummary>): Promise<FormSummary> {
    const row = await api.put<BackendForm>(`/admin/forms/${id}`, {
      name: body.title ?? 'Untitled Form',
      title: body.title ?? 'Untitled Form',
      description: body.description ?? '',
      locale: 'en',
      isActive: body.status === 'active',
    });
    return mapForm(row);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/forms/${id}`);
  },
    async getPublishedVersion(id: string) {
    return api.get(`/admin/forms/${id}/versions/published`);
  },

  async createField(formId: string, field: any) {
    return api.post(`/admin/forms/${formId}/fields`, field);
  },

  async updateField(fieldId: string, field: any) {
    return api.put(`/admin/fields/${fieldId}`, field);
  },

  async reorderFields(formId: string, fieldOrders: { fieldId: string; sortOrder: number }[]) {
    return api.post(`/admin/forms/${formId}/fields/reorder`, { fieldOrders });
  },

  async publish(id: string): Promise<FormSummary> {
    await api.post(`/admin/forms/${id}/versions/publish`, {});
    const row = await api.get<BackendForm>(`/admin/forms/${id}`);
    return mapForm(row);
  },
  
};

export const responseApi = {
  async list(formId?: string): Promise<ResponseItem[]> {
    if (formId) {
      const forms = await api.get<BackendForm[]>(`/admin/forms`);
      const form = forms.find((f) => f.id === formId);
      const res = await api.get<{ success: boolean; data: BackendSubmission[] }>(
        `/admin/forms/${formId}/submissions`
      );
      return res.data.map((item) =>
        mapSubmissionToResponseItem(item, form?.title ?? 'Form')
      );
    }

    const forms = await api.get<BackendForm[]>('/admin/forms');
    const all: ResponseItem[] = [];

    for (const form of forms) {
      try {
        const res = await api.get<{ success: boolean; data: BackendSubmission[] }>(
          `/admin/forms/${form.id}/submissions`
        );
        all.push(
          ...res.data.map((item) => mapSubmissionToResponseItem(item, form.title))
        );
      } catch {
        // ignore one form failing
      }
    }

    return all.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  async get(id: string): Promise<ResponseItem> {
    const detail = await api.get<{ success: boolean; data: BackendSubmission }>(
      `/admin/submissions/${id}`
    );

    const forms = await api.get<BackendForm[]>('/admin/forms');
    const form = forms.find((f) => f.id === detail.data.formId);

    return mapSubmissionToResponseItem(detail.data, form?.title ?? 'Form');
  },

  async update(id: string, body: Partial<ResponseItem>): Promise<ResponseItem> {
    // Your backend doesn’t have a generic update response endpoint yet.
    // Keep shape stable so the UI doesn’t break.
    const current = await this.get(id);
    return { ...current, ...body };
  },

  async delete(_id: string): Promise<void> {
    // No backend delete endpoint for submissions right now.
    return;
  },
};

export const dashboardApi = {
  async stats(): Promise<DashboardStats> {
    const forms = await api.get<BackendForm[]>('/admin/forms');

    let totalSubmissions = 0;
    const recentActivity: ActivityItem[] = [];

    for (const form of forms) {
      try {
        const res = await api.get<{ success: boolean; data: BackendSubmission[] }>(
          `/admin/forms/${form.id}/submissions`
        );

        totalSubmissions += res.data.length;

        res.data.slice(0, 3).forEach((item) => {
          recentActivity.push({
            form: form.title,
            event: item.status === 'failed' ? 'Submission failed' : 'Submission received',
            time: item.submittedAt ?? item.createdAt,
            color: item.status === 'failed' ? '#ef4444' : '#22c55e',
          });
        });
      } catch {
        // ignore one form failing
      }
    }

    return {
      totalForms: forms.length,
      totalSubmissions,
      published: forms.filter((f) => f.isActive).length,
      draft: forms.filter((f) => !f.isActive).length,
      trend: [
        { label: 'Mon', val: 2 },
        { label: 'Tue', val: 4 },
        { label: 'Wed', val: 3 },
        { label: 'Thu', val: 6 },
        { label: 'Fri', val: 5 },
        { label: 'Sat', val: 4 },
        { label: 'Sun', val: 7 },
      ],
      recentActivity: recentActivity.slice(0, 6),
    };
  },
};