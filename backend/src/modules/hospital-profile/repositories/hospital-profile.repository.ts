import { AppDataSource } from '../../../config/data-source.js';
import {
  HospitalDocument,
  HospitalProfile,
  type HospitalType,
} from '../../../database/entities/index.js';

export interface HospitalDocumentView {
  id: number;
  name: string;
  fileName: string;
  mimeType: string | null;
  fileData: string;
  createdAt: Date;
}

export interface HospitalProfileView {
  id: number;
  hospitalName: string;
  hospitalCode: string;
  hospitalType: HospitalType | null;
  registrationNumber: string | null;
  gstNumber: string | null;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
  logoData: string | null;
  website: string | null;
  timeZone: string | null;
  currency: string | null;
  dateFormat: string | null;
  financialYear: string | null;
  documents: HospitalDocumentView[];
  createdAt: Date;
  updatedAt: Date;
}

function toDocumentView(row: HospitalDocument): HospitalDocumentView {
  return {
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileData: row.fileData,
    createdAt: row.createdAt,
  };
}

function toView(row: HospitalProfile): HospitalProfileView {
  return {
    id: row.id,
    hospitalName: row.hospitalName,
    hospitalCode: row.hospitalCode,
    hospitalType: row.hospitalType,
    registrationNumber: row.registrationNumber,
    gstNumber: row.gstNumber,
    contactNumber: row.contactNumber,
    email: row.email,
    address: row.address,
    country: row.country,
    state: row.state,
    district: row.district,
    city: row.city,
    pincode: row.pincode,
    logoData: row.logoData,
    website: row.website,
    timeZone: row.timeZone,
    currency: row.currency,
    dateFormat: row.dateFormat,
    financialYear: row.financialYear,
    documents: (row.documents || []).map(toDocumentView),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const hospitalProfileRepository = {
  repo() {
    return AppDataSource.getRepository(HospitalProfile);
  },

  documentRepo() {
    return AppDataSource.getRepository(HospitalDocument);
  },

  async findCurrent(): Promise<HospitalProfileView | null> {
    const row = await this.repo().find({
      relations: { documents: true },
      order: { id: 'ASC' },
      take: 1,
    });
    return row[0] ? toView(row[0]) : null;
  },

  async upsert(input: {
    hospitalName: string;
    hospitalCode: string;
    hospitalType?: HospitalType | null;
    registrationNumber?: string | null;
    gstNumber?: string | null;
    contactNumber?: string | null;
    email?: string | null;
    address?: string | null;
    country?: string | null;
    state?: string | null;
    district?: string | null;
    city?: string | null;
    pincode?: string | null;
    logoData?: string | null;
    website?: string | null;
    timeZone?: string | null;
    currency?: string | null;
    dateFormat?: string | null;
    financialYear?: string | null;
    documents?: Array<{
      name: string;
      fileName: string;
      mimeType?: string | null;
      fileData: string;
    }>;
  }): Promise<HospitalProfileView> {
    return AppDataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(HospitalProfile);
      const documentRepo = manager.getRepository(HospitalDocument);

      const existing = await profileRepo.find({
        order: { id: 'ASC' },
        take: 1,
      });

      const row = existing[0] ?? profileRepo.create();

      row.hospitalName = input.hospitalName;
      row.hospitalCode = input.hospitalCode;
      if (input.hospitalType !== undefined) row.hospitalType = input.hospitalType;
      if (input.registrationNumber !== undefined) row.registrationNumber = input.registrationNumber;
      if (input.gstNumber !== undefined) row.gstNumber = input.gstNumber;
      if (input.contactNumber !== undefined) row.contactNumber = input.contactNumber;
      if (input.email !== undefined) row.email = input.email;
      if (input.address !== undefined) row.address = input.address;
      if (input.country !== undefined) row.country = input.country;
      if (input.state !== undefined) row.state = input.state;
      if (input.district !== undefined) row.district = input.district;
      if (input.city !== undefined) row.city = input.city;
      if (input.pincode !== undefined) row.pincode = input.pincode;
      if (input.logoData !== undefined) row.logoData = input.logoData;
      if (input.website !== undefined) row.website = input.website;
      if (input.timeZone !== undefined) row.timeZone = input.timeZone;
      if (input.currency !== undefined) row.currency = input.currency ?? 'INR';
      if (input.dateFormat !== undefined) row.dateFormat = input.dateFormat;
      if (input.financialYear !== undefined) row.financialYear = input.financialYear;

      if (!existing[0]) {
        row.hospitalType = input.hospitalType ?? null;
        row.registrationNumber = input.registrationNumber ?? null;
        row.gstNumber = input.gstNumber ?? null;
        row.contactNumber = input.contactNumber ?? null;
        row.email = input.email ?? null;
        row.address = input.address ?? null;
        row.country = input.country ?? null;
        row.state = input.state ?? null;
        row.district = input.district ?? null;
        row.city = input.city ?? null;
        row.pincode = input.pincode ?? null;
        row.logoData = input.logoData ?? null;
        row.website = input.website ?? null;
        row.timeZone = input.timeZone ?? 'Asia/Kolkata';
        row.currency = input.currency ?? 'INR';
        row.dateFormat = input.dateFormat ?? 'DD/MM/YYYY';
        row.financialYear = input.financialYear ?? null;
      }

      const saved = await profileRepo.save(row);

      if (input.documents) {
        await documentRepo.delete({ hospitalProfileId: saved.id });
        if (input.documents.length) {
          await documentRepo.save(
            input.documents.map((document) =>
              documentRepo.create({
                hospitalProfileId: saved.id,
                name: document.name,
                fileName: document.fileName,
                mimeType: document.mimeType ?? null,
                fileData: document.fileData,
              }),
            ),
          );
        }
      }

      const withDocs = await profileRepo.findOne({
        where: { id: saved.id },
        relations: { documents: true },
      });

      return toView(withDocs!);
    });
  },
};
