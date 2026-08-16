import "server-only";

import type { ProfileRepository } from "@/src/repositories/profile.repository";
import { mapRepositoryError, ServiceError } from "@/src/services/errors";
import type {
  ProfileDTO,
  ProfileUpdateData,
} from "@/src/types/profile";

export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async findProfile(userId: string): Promise<ProfileDTO | null> {
    try {
      return await this.profileRepository.findById(userId);
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  async getProfile(userId: string): Promise<ProfileDTO> {
    const profile = await this.findProfile(userId);

    if (!profile) {
      throw new ServiceError("NOT_FOUND");
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateData: ProfileUpdateData,
  ): Promise<ProfileDTO> {
    try {
      return await this.profileRepository.update(userId, updateData);
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  async getUserRole(userId: string): Promise<ProfileDTO["role"]> {
    const profile = await this.getProfile(userId);
    return profile.role;
  }
}
