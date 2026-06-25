const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

export interface Institution {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  institutionId: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  themeMode: 'light' | 'dark';
  accentColor: string;
  tokensProfessor: number;
  tokensTutor: number;
  tokensColega: number;
  creditsMonthly: number;
  institutions: string[];
  classroomId?: string;
}

export interface UserAdmin extends User {
  createdAt: string;
}

export interface Persona {
  id: string;
  userId: string;
  institutionId?: string;
  institutionName?: string;
  nome: string;
  descricao: string;
  saudacao: string;
  documentoPedagogico: string;
  isGenerico: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface Disciplina {
  id: string;
  userId: string;
  institutionId: string;
  institutionName?: string;
  nome: string;
  conteudo: string;
  createdAt: string;
  professores_vinculados?: string[];
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  persona: string;
  personaDbId?: string;
  disciplinaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  tokensUsed: number;
  creditsUsed: number;
  createdAt: string;
}

export interface LabProject {
  id: string;
  userId: string;
  institutionId: string;
  title: string;
  description: string;
  htmlContent: string;
  isPublic: number;
  avgStars: number;
  feedbackCreator: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  institutionId: string;
  createdAt: string;
  classroomsList?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: string;
  targetClassroomId?: string;
  referenceId?: string;
  createdAt: string;
  seen: number;
  dismissed: number;
}

export interface LabMessage {
  id: string;
  projectId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  tokensUsed: number;
  creditsUsed: number;
  createdAt: string;
  edit_scope?: 'full_rewrite' | 'surgical' | null;
  patched_functions?: string | null;
  imageUrl?: string | null;
}

class ApiClient {
  private baseUrl = API_URL;

  private get headers() {
    const token = localStorage.getItem('tutorai_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Ocorreu um erro inesperado.' }));
      throw new Error(error.error || `Erro na requisição: ${res.status}`);
    }
    return res.json();
  }

  async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Ocorreu um erro inesperado.' }));
      throw new Error(error.error || `Erro na requisição: ${res.status}`);
    }
    return res.json();
  }

  async put<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Ocorreu um erro inesperado.' }));
      throw new Error(error.error || `Erro na requisição: ${res.status}`);
    }
    return res.json();
  }

  async patch<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Ocorreu um erro inesperado.' }));
      throw new Error(error.error || `Erro na requisição: ${res.status}`);
    }
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Ocorreu um erro inesperado.' }));
      throw new Error(error.error || `Erro na requisição: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // Lab Endpoints
  lab = {
    getProjects: () => this.get<LabProject[]>('/api/lab/projects'),
    createProject: (data: { title: string }) => this.post<LabProject>('/api/lab/projects', data),
    getProject: (id: string) => this.get<LabProject & { messages: LabMessage[] }>(`/api/lab/projects/${id}`),
    renameProject: (id: string, title: string) => this.put<{ ok: boolean }>(`/api/lab/projects/${id}/title`, { title }),
    deleteProject: (id: string) => this.delete<{ ok: boolean }>(`/api/lab/projects/${id}`),
    sendMessage: (projectId: string, content: string, modelToUse?: string, userImageUrl?: string) =>
      this.post<{ userMessage: LabMessage; assistantMessage: LabMessage; htmlContent: string }>(
        `/api/lab/projects/${projectId}/messages`, { content, modelToUse, userImageUrl }
      ),
    rateProject: (projectId: string, stars: number) =>
      this.post<{ ok: boolean }>(`/api/lab/projects/${projectId}/rate`, { stars }),
    giveFeedback: (projectId: string, type: 'like' | 'dislike') =>
      this.post<{ ok: boolean }>(`/api/lab/projects/${projectId}/feedback`, { type }),
  };

  // AVA & Activities
  ava = {
    getMyClasses: () => this.get<Classroom[]>('/api/classrooms/my-classes'),
    getMyClass: (classroomId?: string) => this.get<{ classroom: Classroom | null; disciplinas: Disciplina[]; activities: Activity[] }>(
      classroomId ? `/api/classrooms/my-class?classroomId=${classroomId}` : '/api/classrooms/my-class'
    ),
    getClassMural: (classroomId: string) => this.get<{ classroom: Classroom | null; disciplinas: Disciplina[]; activities: Activity[] }>(`/api/classrooms/${classroomId}/mural`),
    getActivities: () => this.get<Activity[]>('/api/activities'),
    createActivity: (data: { title: string; description: string; dueDate: string; institutionId: string; classroomIds: string[] }) =>
      this.post<Activity>('/api/activities', data),
    deleteActivity: (id: string) => this.delete<{ ok: boolean }>(`/api/activities/${id}`),
  };

  // Notifications
  notifications = {
    getAll: () => this.get<AppNotification[]>('/api/notifications'),
    markAsSeen: (id: string) => this.post<{ ok: boolean }>(`/api/notifications/${id}/seen`, {}),
    dismiss: (id: string) => this.post<{ ok: boolean }>(`/api/notifications/${id}/dismiss`, {}),
  };

  // Admin Endpoints
  admin = {
    institutions: {
      getAll: () => this.get<Institution[]>('/api/admin/institutions'),
      getById: (id: string) => this.get<Institution>(`/api/admin/institutions/${id}`),
      create: (data: Omit<Institution, 'id' | 'createdAt'>) => this.post<Institution>('/api/admin/institutions', data),
      update: (id: string, data: Partial<Omit<Institution, 'id' | 'createdAt'>>) => this.patch<Institution>(`/api/admin/institutions/${id}`, data),
      delete: (id: string) => this.delete<void>(`/api/admin/institutions/${id}`),
    },
    classrooms: {
      getByInstitution: (institutionId: string) => this.get<Classroom[]>(`/api/admin/institutions/${institutionId}/classrooms`),
      create: (institutionId: string, name: string) => this.post<Classroom>(`/api/admin/institutions/${institutionId}/classrooms`, { name }),
      update: (id: string, name: string) => this.patch<Classroom>(`/api/admin/classrooms/${id}`, { name }),
      delete: (id: string) => this.delete<void>(`/api/admin/classrooms/${id}`),
      getUsers: (classroomId: string) => this.get<{ usersInClass: any[]; availableUsers: any[] }>(`/api/admin/classrooms/${classroomId}/users`),
      addUser: (classroomId: string, userId: string, role: string) => this.post<{ success: boolean }>(`/api/admin/classrooms/${classroomId}/users`, { userId, role }),
      removeUser: (classroomId: string, userId: string) => this.delete<{ success: boolean }>(`/api/admin/classrooms/${classroomId}/users/${userId}`),
    },
    users: {
      getAll: () => this.get<UserAdmin[]>('/api/admin/users'),
      getById: (id: string) => this.get<UserAdmin>(`/api/admin/users/${id}`),
      update: (id: string, data: Partial<Omit<UserAdmin, 'id' | 'createdAt'>>) => this.patch<UserAdmin>(`/api/admin/users/${id}`, data),
      delete: (id: string) => this.delete<void>(`/api/admin/users/${id}`),
    },
  };
}

export const api = new ApiClient();
