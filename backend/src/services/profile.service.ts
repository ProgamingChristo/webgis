import "server-only";

import type {
  ProfileRepository,
} from "@/src/repositories/profile.repository";

import {
  mapRepositoryError,
  ServiceError,
} from "@/src/services/errors";

import type {
  AccountRole,
  ProfileDTO,
  PublicProfileDTO,
  ProfileUpdateData,
} from "@/src/types/profile";

export class ProfileService {
  constructor(
    private readonly profileRepository:
      ProfileRepository,
  ) {}

  async findProfile(
    userId: string,
  ): Promise<
    ProfileDTO | null
  > {
    try {
      return await this
        .profileRepository
        .findById(userId);
    } catch (error) {
      throw mapRepositoryError(
        error,
      );
    }
  }

  async getProfile(
    userId: string,
  ): Promise<ProfileDTO> {
    const profile =
      await this.findProfile(
        userId,
      );

    if (!profile) {
      throw new ServiceError(
        "NOT_FOUND",
      );
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateData:
      ProfileUpdateData,
  ): Promise<ProfileDTO> {
    try {
      return await this
        .profileRepository
        .update(
          userId,
          updateData,
        );
    } catch (error) {
      throw mapRepositoryError(
        error,
      );
    }
  }

  async getPublicProfile(
    userId: string,
  ): Promise<PublicProfileDTO> {
    try {
      const profile =
        await this
          .profileRepository
          .findPublicById(userId);

      if (!profile) {
        throw new ServiceError(
          "NOT_FOUND",
        );
      }

      return profile;
    } catch (error) {
      throw mapRepositoryError(
        error,
      );
    }
  }

  async listPublicProfiles(
    filters: {
      search?: string;
      limit: number;
    },
  ): Promise<PublicProfileDTO[]> {
    try {
      return await this
        .profileRepository
        .findPublicProfiles(filters);
    } catch (error) {
      throw mapRepositoryError(
        error,
      );
    }
  }

  async getAccountRole(
    userId: string,
  ): Promise<AccountRole> {
    const profile =
      await this.getProfile(
        userId,
      );

    return profile.account_role;
  }
}
