# Type System Organization

This directory contains all TypeScript type definitions organized by model/domain.

## 📁 Structure

```
src/types/
├── auth.types.ts          # Authentication, authorization, JWT types
├── user.types.ts          # User model types
├── doctor.types.ts        # Doctor model types
├── client.types.ts        # Client model types
├── availability.types.ts  # Availability model types
├── appointment.types.ts   # Appointment model types
├── conversation.types.ts  # Conversation model types
├── index.ts              # Central export file
└── README.md             # This file
```

## 📖 Type Files Guide

### `auth.types.ts` - Authentication & Authorization
- **UserRole** - Union type of user roles: 'admin' | 'doctor' | 'user' | 'client'
- **AuthUser** - JWT payload with user info
- **AuthenticatedRequest** - Express Request with authenticated user
- **TokenPair** - Access + refresh token pair
- **AuthResponse** - Login/register response shape
- **RefreshTokenDoc** - Refresh token document structure

### `user.types.ts` - User Model
- **User** - User document in database
- **UserResponse** - User data for API responses (no password)
- **UserRegisterInput** - Registration request shape
- **UserUpdateInput** - User update request shape
- **UserPopulated** - User with expanded references

### `doctor.types.ts` - Doctor Model
- **Doctor** - Doctor document in database
- **DoctorResponse** - Doctor with populated user
- **DoctorInput** - Doctor create/update request
- **DoctorPopulated** - Doctor with expanded user reference

### `client.types.ts` - Client Model
- **Client** - Client document in database
- **ClientResponse** - Client for API responses
- **ClientInput** - Client create/update request
- **ClientWithConversation** - Client with conversation data

### `availability.types.ts` - Availability Model
- **Availability** - Availability document in database
- **AvailabilityResponse** - Availability with populated doctor
- **AvailabilityInput** - Availability create/update request
- **AvailabilityPopulated** - Availability with expanded doctor
- **AppointmentDuration** - Type for valid durations (15|30|45|60)

### `appointment.types.ts` - Appointment Model
- **Appointment** - Appointment document in database
- **AppointmentResponse** - Appointment with populated relations
- **AppointmentInput** - Appointment create/update request
- **AppointmentPopulated** - Appointment with expanded references
- **AppointmentStatus** - Type for appointment states

### `conversation.types.ts` - Conversation Model
- **Conversation** - Conversation document in database
- **ConversationResponse** - Conversation with populated client
- **ConversationInput** - Conversation create/update request
- **ConversationPopulated** - Conversation with expanded client
- **ConversationMessage** - Message structure
- **ConversationStep** - Type for conversation flow states

### `index.ts` - Central Export
Re-exports all types from all files for convenient importing.

## 🚀 Usage

### Import all types
```typescript
import type { User, Doctor, Appointment, UserRole } from '../types';
```

### Import specific domain types
```typescript
import type { User, UserResponse, UserPopulated } from '../types/user.types';
import type { Appointment, AppointmentStatus } from '../types/appointment.types';
```

### Import with backward compatibility
```typescript
// Old way (still works via re-export in authMiddleware.ts)
import type { AuthUser, UserRole } from '../middlewares/authMiddleware';

// New preferred way
import type { AuthUser, UserRole } from '../types/auth.types';
```

## 🔄 Type Patterns

### Database vs Response Types
- **`XyzInput`** - Request body for create/update operations
- **`Xyz`** - Database document with optional `_id`, `id`, timestamps
- **`XyzResponse`** - API response (no sensitive fields, populated relations)
- **`XyzPopulated`** - Database document with expanded references (uses `Omit` + intersection)

### Populated Pattern Example
```typescript
// Base interface (references are IDs)
export interface Doctor {
  user: string;  // Just the ID
}

// Populated interface (references are expanded objects)
export interface DoctorPopulated extends Omit<Doctor, 'user'> {
  user: User;    // Full User object
}
```

## ✅ Best Practices

1. **Always use type imports** for type definitions:
   ```typescript
   import type { User } from '../types/user.types';
   ```

2. **Group related types** in the same file by model

3. **Use Union types** for enums:
   ```typescript
   export type UserRole = 'admin' | 'doctor' | 'user' | 'client';
   ```

4. **Document complex interfaces** with JSDoc comments

5. **Maintain separation** between database types and response types

6. **Use `Omit` for populated types** to override specific fields

## 🔗 Migration Guide

If you have types scattered in different files, consolidate them here:

1. Create a new `xyz.types.ts` file
2. Add all related interfaces/types
3. Export from `index.ts`
4. Update imports in consuming files
5. Delete redundant type definitions from old locations

---

**Version:** 1.0  
**Last Updated:** April 20, 2026  
**Status:** ✅ Production Ready
