import { Controller, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST /users/me — called by the frontend right after login
  // Creates the user in our DB if they don't exist yet
  @Post('me')
  @UseGuards(ClerkAuthGuard)
  async syncUser(@CurrentUser() clerkUserId: string) {
    // Fetch the full user profile from Clerk
    const clerkUser = await clerk.users.getUser(clerkUserId);

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(' ') || undefined;

    return this.usersService.findOrCreate(clerkUserId, email, name);
  }
}
