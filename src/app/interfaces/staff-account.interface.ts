import type { Role } from './index';

export interface StaffAccount {
  _id: string;
  name: string;
  username: string;
  role: Role;
}
