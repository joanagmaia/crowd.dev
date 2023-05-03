ALTER TABLE public."organizations" ADD COLUMN "lastEnrichedAt" TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public."organizations" ADD COLUMN "employeeCountByCountry" JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE public."organizations" ADD COLUMN "type" TEXT NULL;
ALTER TABLE public."organizations" ADD COLUMN "ticker" TEXT NULL;
ALTER TABLE public."organizations" ADD COLUMN "headline" TEXT NOT NULL DEFAULT '';
ALTER TABLE public."organizations" ADD COLUMN "profiles" TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
ALTER TABLE public."organizations" ADD COLUMN "naics" JSONB[] NOT NULL DEFAULT '{}'::JSONB[];
ALTER TABLE public."organizations" ADD COLUMN "industry" TEXT NOT NULL DEFAULT '';
ALTER TABLE public."organizations" ADD COLUMN "founded" INTEGER NULL;