// src/types/index.ts
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  checked: boolean;
  addedBy: string;
  addedAt: Date;
  price?: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: string[];
  code: string;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  familyId?: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  expirationDate: Date;
  category: string;
  addedAt: Date;
}
