export type InboxEmailSummary = {
  id: string;
  subject: string | null;
  sender: string | null;
  recipient: string | null;
  date: string | null;
  read: boolean;
  starred: boolean;
  thread_id: string | null;
  folder_id: string;
  snippet: string;
};

export type InboxEmailFull = {
  id: string;
  subject: string | null;
  sender: string | null;
  recipient: string | null;
  date: string | null;
  body: string | null;
  thread_id: string | null;
  message_id: string | null;
};

export type InboxFolder = {
  id: string;
  name: string;
};

export type InboxClient = {
  listInboxEmails: (limit: number) => Promise<InboxEmailSummary[]>;
  getEmail: (id: string) => Promise<InboxEmailFull>;
  getFolders: () => Promise<InboxFolder[]>;
  createFolder: (name: string) => Promise<InboxFolder | null>;
  moveEmail: (id: string, folderId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

export function createInboxClient(options: {
  apiUrl: string;
  mailbox: string;
  cfAccessClientId: string;
  cfAccessClientSecret: string;
}): InboxClient {
  const base = options.apiUrl.replace(/\/+$/, "");
  const mailboxPath = `${base}/api/v1/mailboxes/${encodeURIComponent(options.mailbox)}`;
  const headers = {
    "CF-Access-Client-Id": options.cfAccessClientId,
    "CF-Access-Client-Secret": options.cfAccessClientSecret,
    "Content-Type": "application/json",
  };

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${mailboxPath}${path}`, { ...init, headers, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      throw new Error(
        `Inbox API ${init?.method ?? "GET"} ${path} was redirected to the Cloudflare Access login page. ` +
          "The service token was not accepted — check CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET and the Access policy.",
      );
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Inbox API ${init?.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    async listInboxEmails(limit) {
      const result = await request<{ emails: InboxEmailSummary[]; totalCount: number }>(
        `/emails?folder=inbox&limit=${limit}&sortColumn=date&sortDirection=ASC`,
      );
      return result.emails;
    },
    async getEmail(id) {
      return request<InboxEmailFull>(`/emails/${encodeURIComponent(id)}`);
    },
    async getFolders() {
      return request<InboxFolder[]>("/folders");
    },
    async createFolder(name) {
      const response = await fetch(`${mailboxPath}/folders`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      // 409 means the folder already exists; caller re-reads the folder list.
      if (response.status === 409) return null;
      if (!response.ok) {
        throw new Error(`Inbox API POST /folders failed: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as InboxFolder;
    },
    async moveEmail(id, folderId) {
      await request(`/emails/${encodeURIComponent(id)}/move`, {
        method: "POST",
        body: JSON.stringify({ folderId }),
      });
    },
    async markRead(id) {
      await request(`/emails/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ read: true }),
      });
    },
  };
}
