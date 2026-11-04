-- The Supervisors list is restricted to developers and the admins a
-- developer grants access to.
ALTER TABLE "User" ADD COLUMN "supervisorListAccess" BOOLEAN NOT NULL DEFAULT false;
