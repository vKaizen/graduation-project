/* eslint-disable prettier/prettier */
export class CreateUserDto {
    fullName: string;
    email: string;
    profilePictureUrl?: string;
    jobTitle?: string;
    departmentOrTeam?: string;
    role?: string;
    bio?: string;
  }