import API from "./axios-client";

type forgotPasswordType = { email: string };
type resetPasswordType = { password: string; verificationCode: string };

type LoginType = {
  email: string;
  password: string;
};

type registerType = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type verifyEmailType = { code: string };
type verifyMFAType = { code: string; secretKey: string };
type mfaLoginType = { code: string; email: string };

type SessionType = {
  _id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SessionResponseType = {
  message: string;
  sessions: SessionType[];
};

export type mfaType = {
  message: string;
  secret: string;
  qrImageUrl: string;
};

export const loginMutationFn = async (data: LoginType) =>
  await API.post("/auth/login", data);

export const registerMutationFn = async (data: registerType) =>
  await API.post(`/auth/register`, data);

export const verifyEmailMutationFn = async (data: verifyEmailType) =>
  await API.post(`/auth/verify/email`, data);

export const forgotPasswordMutationFn = async (data: forgotPasswordType) =>
  await API.post(`/auth/password/forgot`, data);

export const resetPasswordMutationFn = async (data: resetPasswordType) =>
  await API.post(`/auth/password/reset`, data);

export const verifyMFALoginMutationFn = async (data: mfaLoginType) =>
  await API.post(`/mfa/verify-login`, data);

export const logoutMutationFn = async () => await API.post(`/auth/logout`);

export const mfaSetupQueryFn = async () => {
  const response = await API.get<mfaType>(`/mfa/setup`);
  return response.data;
};

export const verifyMFAMutationFn = async (data: verifyMFAType) =>
  await API.post(`/mfa/verify`, data);

export const revokeMFAMutationFn = async () => await API.put(`/mfa/revoke`, {});

export const getUserSessionQueryFn = async () => await API.get(`/session/`);

export const sessionsQueryFn = async () => {
  const response = await API.get<SessionResponseType>(`/session/all`);
  return response.data;
};

export const sessionDelMutationFn = async (id: string) =>
  await API.delete(`/session/${id}`);

// ponytail: SaaS v1 contract mirrors backend/FEATURES.md B-E; backend not coded yet
export type OrgType = { _id: string; name: string; ownerId: string };
export type ProjectType = { _id: string; orgId: string; name: string; archived: boolean };
export type TaskStatus = "todo" | "doing" | "done";
export type TaskType = {
  _id: string;
  projectId: string;
  orgId: string;
  title: string;
  desc?: string;
  status: TaskStatus;
  priority: "low" | "med" | "high";
  assigneeId?: string;
  order: number;
};
export type MemberType = { userId: string; email?: string; role: "admin" | "member" };
export type CommentType = { _id: string; taskId: string; authorId: string; body: string };

export const orgsQueryFn = async () => {
  const res = await API.get<{ orgs: OrgType[] }>(`/orgs`);
  return res.data;
};
export const createOrgMutationFn = async (data: { name: string }) =>
  await API.post(`/orgs`, data);

export const membersQueryFn = async (orgId: string) => {
  const res = await API.get<{ members: MemberType[] }>(`/orgs/${orgId}/members`);
  return res.data;
};
export const inviteMemberMutationFn = async (orgId: string, data: { email: string }) =>
  await API.post(`/orgs/${orgId}/invite`, data);
export const updateMemberRoleMutationFn = async (
  orgId: string,
  userId: string,
  data: { role: "admin" | "member" }
) => await API.put(`/orgs/${orgId}/members/${userId}`, data);
export const removeMemberMutationFn = async (orgId: string, userId: string) =>
  await API.delete(`/orgs/${orgId}/members/${userId}`);
export const acceptInviteMutationFn = async (data: { code: string }) =>
  await API.post(`/invites/accept`, data);

export const projectsQueryFn = async (orgId: string) => {
  const res = await API.get<{ projects: ProjectType[] }>(`/orgs/${orgId}/projects`);
  return res.data;
};
export const createProjectMutationFn = async (orgId: string, data: { name: string }) =>
  await API.post(`/orgs/${orgId}/projects`, data);

export const tasksQueryFn = async (projectId: string, status?: TaskStatus) => {
  const res = await API.get<{ tasks: TaskType[] }>(`/projects/${projectId}/tasks`, {
    params: { status, limit: 50 },
  });
  return res.data;
};
export const createTaskMutationFn = async (
  projectId: string,
  data: { title: string; desc?: string }
) => await API.post(`/projects/${projectId}/tasks`, data);
export const moveTaskMutationFn = async (
  taskId: string,
  data: { status: TaskStatus; order?: number }
) => await API.put(`/tasks/${taskId}/move`, data);
export const deleteTaskMutationFn = async (taskId: string) =>
  await API.delete(`/tasks/${taskId}`);

export const commentsQueryFn = async (taskId: string) => {
  const res = await API.get<{ comments: CommentType[] }>(`/tasks/${taskId}/comments`);
  return res.data;
};
export const createCommentMutationFn = async (taskId: string, data: { body: string }) =>
  await API.post(`/tasks/${taskId}/comments`, data);
