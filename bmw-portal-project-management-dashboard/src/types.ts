// bmw-portal-project-management-dashboard/types.ts

export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  // FIX: Add index signature for recharts compatibility.
  [key: string]: any;
}

export type ProjectStatus = "On Track" | "Delayed" | "At Risk" | "Completed";

export interface Project {
  name: string;
  date: string;
  progress: number;
  status: ProjectStatus;
  assigned: { name: string; avatarUrl: string }[];
  extraAssignees: number;
}

export interface Product {
  imageUrl: string;
  name: string;
  category: string;
  price: string;
  sold: number;
  profit: string;
}

export interface PageTab {
  label: string;
  nestedTabs?: PageTab[];
  count?: number;
}

export interface PageConfig {
  [key: string]: {
    tabs: PageTab[];
  };
}

export interface ImportantLink {
  category: string;
  url: string;
  description?: string;
}

export interface User {
  username: string;
  role: "Admin" | "User";
}

export interface ServerInventory {
  id: string;
  hostname: string;
  ipAddress: string;
  environment: "Prod" | "Dev" | "Test" | "QA" | "Lab" | "Edu";
  description?: string;
  os: string;
  kernelPatchLevel?: string;
  cpu: string;
  memory: string;
  disk: string;
  javaVersion: string;
  jbossVersion?: string;
  webSphereVersion?: string;
  webLogicVersion?: string;
  apacheVersion?: string;
  nginxVersion?: string;
  tlsVersion?: string;
  ctgVersion?: string;
  hazelcastVersion?: string;
  mqVersion?: string;
  kafkaVersion?: string;
  redisVersion?: string;
  networkPorts?: string;
  owner?: string;
  lastUpdate?: string;
}

export type ApplicationStatus = "Running" | "Stopped" | "Starting" | "Error";

export interface ApplicationInventory {
  id: number;
  applicationName: string;
  hostname: string;
  version: string;
  deploymentDate: string;
  status: ApplicationStatus;
  // Optional version details, populated by joining server data
  javaVersion?: string;
  jbossVersion?: string;
  websphereVersion?: string;
  // Detailed fields for modal
  jvmDetails?: {
    path: string;
    memory: string;
    heapSize: string;
  };
  datasourceInfo?: {
    jndi: string;
    url: string;
    user: string;
  };
  middlewareInfo?: string;
  securityConfig?: {
    certificate: string;
    tlsVersion: string;
  };
  ownerTeam: string;
}

export interface KdbCertificate {
  id: number;
  environment: "Prod" | "Test" | "Dev" | "QA" | "Lab" | "Edu";
  server: string;
  kdbPath: string;
  alias: string;
  issuer: string;
  subject: string;
  validTo: string; // Expiry Date
  // Detailed fields
  trustStatus?: "Trusted" | "Expiring" | "Expired" | "Unknown";
  serialNumber?: string;
  version?: string;
  validFrom?: string;
  keyAlgorithm?: string;
  keySize?: string;
  signatureAlgorithm?: string;
  sha1?: string;
  sha256?: string;
  importDate?: string;
  cmsStashInfo?: string;
}

export interface JavaCertificate {
  id: number;
  environment: "Prod" | "Test" | "Dev" | "QA" | "Lab" | "Edu";
  server: string;
  javaHome: string;
  aliasName: string;
  issuer: string;
  subject: string;
  validTo: string; // Expiry Date
  // Detailed fields for modal view
  serialNumber?: string;
  version?: string;
  validFrom?: string;
  trustStatus?: "Trusted" | "Expiring" | "Expired" | "Unknown";
  keyAlgorithm?: string;
  keySize?: string;
  signatureAlgorithm?: string;
  sha1?: string;
  sha256?: string;
}

export interface OpenshiftInventory {
  id: number;
  environment: "Prod" | "Test" | "Dev" | "QA" | "Lab" | "Edu";
  clusterName: string;
  clusterVersion: string;
  namespace: string;
  nodes: string; // e.g., "5 Ready / 0 NotReady"
  cpuCapacity?: string;
  memoryCapacity?: string;
  storage?: string;
  applications?: number;
  pods?: string; // e.g., "120 Running / 5 Pending / 0 Error"
  services?: number;
  routes?: number;
  tlsCerts?: number;
  owner?: string;
  lastSync?: string;
  eventsSummary?: string;
}

export type DatasourceStatus = "Active" | "Inactive" | "Error";

export interface DatasourceInventory {
  id: number;
  environment: "Prod" | "Test" | "Dev" | "QA" | "Lab" | "Edu";
  server: string;
  applicationName: string;
  datasourceName: string; // JNDI
  dbType: "Oracle" | "MSSQL" | "MySQL" | "DB2" | "PostgreSQL";
  connectionURL: string;
  user: string;
  status: DatasourceStatus;
  // Optional fields for main table and details
  totalRequests?: number;
  activeConnections?: number;
  maxConnections?: number;
  avgResponseTime?: number; // in ms
  lastTestResult?: "Success" | "Failed";
  ownerTeam?: string;
  // Fields only for modal
  connectionPoolSettings?: {
    min: number;
    max: number;
    timeout: number; // in seconds
  };
  lastUpdate?: string; // YYYY-MM-DD
}

// FIX: Add missing OnCallPerson interface to resolve import error.
export interface OnCallPerson {
  date: string; // YYYY-MM-DD
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
}

export interface DashboardCertificate {
  id: string;
  name: string;
  type: "Java Cacerts" | "WebSphere KDB";
  issuer: string;
  expireDate: string; // YYYY-MM-DD
}

export interface AskGTArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    name: string;
    avatarUrl?: string;
    department?: string;
  };
  category: string;
  tags: string[];
  publishDate: string; // YYYY-MM-DD
  readTime: number; // dakika
  likes: number;
  views: number;
  thumbnailUrl?: string;
  isFavorite?: boolean;
}

export interface AskGTCategory {
  id: string;
  name: string;
  icon?: string;
  color: string;
}

/**
 * Ansible Templates (UI)
 * - Template list + detail panel için basit model
 */
export interface AnsibleTemplate {
  id: string;

  name: string;
  owner: string;

  description?: string;
  purpose?: string;
  notes?: string;
  surveyInfo?: string;

  tags?: string[];

  content: string;

  // ✅ backend legacy field
  linkUrl?: string;

  // ✅ yeni field (UI tarafında da tutulabilir)
  goUrl?: string;

  createdAt?: string;
  updatedAt?: string;
}

export type SelfServiceSample = {
  type: "link" | "text";
  value: string;
};

export interface SelfServiceItem {
  id: string;
  title: string;
  order: number;

  // required indexes
  tabId: string;
  subTabId: string;

  info?: string;
  goUrl: string; // required
  requestExample: string; // required
  details?: string;
  sample: SelfServiceSample; // required
  extra?: string;
}

export interface SelfServiceSubTab {
  id: string;
  name: string;
  order: number;
  items: SelfServiceItem[];
}

export interface SelfServiceTab {
  id: string;
  name: string;
  order: number;
  subTabs: SelfServiceSubTab[];
}

export interface SelfServiceStore {
  version: number;
  tabs: SelfServiceTab[];
}