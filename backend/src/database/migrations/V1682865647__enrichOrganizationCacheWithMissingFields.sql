ALTER TABLE public."organizationCaches" ADD COLUMN "lastEnrichedAt" TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public."organizationCaches" ADD COLUMN "employeeCountByCountry" JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE public."organizationCaches" ADD COLUMN "type" TEXT NULL;
ALTER TABLE public."organizationCaches" ADD COLUMN "ticker" TEXT NULL;
ALTER TABLE public."organizationCaches" ADD COLUMN "headline" TEXT NOT NULL DEFAULT '';
ALTER TABLE public."organizationCaches" ADD COLUMN "profiles" TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
ALTER TABLE public."organizationCaches" ADD COLUMN "naics" JSONB[] NOT NULL DEFAULT '{}'::JSONB[];
ALTER TABLE public."organizationCaches" ADD COLUMN "industry" TEXT NOT NULL DEFAULT '';
ALTER TABLE public."organizationCaches" ADD COLUMN "founded" INTEGER NULL;