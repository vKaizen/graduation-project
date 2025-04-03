/* eslint-disable prettier/prettier */
// src/validators/IsValidRoleConstraint.ts

import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsValidRoleConstraint implements ValidatorConstraintInterface {
  validate(role: any): boolean {
    const validRoles = ['Admin', 'Member', 'Guest'];
    return validRoles.includes(role);
  }

  defaultMessage(): string {
    return `Role must be one of the following: ${['Admin', 'Member', 'Guest'].join(', ')}`;
  }
}
