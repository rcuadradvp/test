export interface Device {
  uuid: string;
  companyId: string | null;
  company: {
    uuid: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
    updatedAt: number;
    createdAt: number;
  };
  name: string;
  mac: string;
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;
  type: string | null;
  description: string | null;
  updatedAt: number;
  createdAt: number;
}

export interface AuthorizedDevicesMap {
  [mac: string]: string;
}

export interface DevicesResponse {
  status: number;
  message: string;
  data: Device[];
  first: boolean;
  last: boolean;
  currentPageNumber: number;
  itemsInPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  sort: Array<{
    direction: string;
    property: string;
    ignoreCase: boolean;
    nullHandling: string;
    ascending: boolean;
    descending: boolean;
  }>;
}