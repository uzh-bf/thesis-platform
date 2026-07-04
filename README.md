# Thesis-Platform

This project serves as a platform to facilitate the creation, management, and viewing of academic proposals. The system allows users to create new proposals, view proposal details, manage feedback, and update proposal statuses. It categorizes proposals based on their topic area and differentiates between student and supervisor roles, ensuring a clear and organized workflow.

The motivation behind this project is to offer academic institutions an efficient mechanism to simplify the proposal submission, evaluation, and feedback cycles, thereby facilitating a smoother pairing of students with their respective supervisors.

## Requirements

- PostgreSQL database

## Installation

How to install the project:

```bash
# Clone the repository
git clone https://github.com/uzh-bf/thesis-platform.git

# Navigate into the directory
cd thesis-platform

# Install dependencies
pnpm install
```

❗️Make sure your IP address has access to the PostgreSQL database (include IP for Azure DB on [Azure](https://portal.azure.com)).❗️

For local database development, run PostgreSQL locally or use the configured development database. Use this connection string shape unless Doppler provides another `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://thesis:<local-password>@localhost:5432/thesis?sslmode=disable"
```

For a fully local development stack without Doppler, copy `.env.local.template`
to `.env.local`, then run:

```bash
docker compose up -d postgres azurite oidc mailhog
pnpm run prisma:setup:local
pnpm run dev:local
```

The local OIDC mock is available at `http://localhost:4011/default` with fixed
development admin claims for `admin@example.com`. The NextAuth provider wiring
is handled in the local-auth slice. Azurite serves Blob Storage locally at
`http://127.0.0.1:11000/devstoreaccount1`, and Postgres is published on
`localhost:15432`. The compose `next` profile remains a container smoke path;
the documented local development path runs Next on the host.

## Usage

```bash
# Run the web app in developer mode
pnpm run dev
```

The web app should now be visible on <https://localhost:3000>.

### Steps

## Deployment

The following instructions will guide you through the deployment process step by step.

### Pre-requisites

Your system should have the following installed:

- [Helm](https://helm.sh/)
- [Helmfile](https://helmfile.readthedocs.io/en/latest/)
- [Helm diff plugin](https://github.com/databus23/helm-diff)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [az cli](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
  - `az login`
  - `az aks get-credentials --resource-group ibf_devops_rg --name bf-k8s463ba113`

### Deployment steps

Here are the steps you'll need to follow for deployment:

1. Start in the development environment:

   Run the command `pnpm run release:beta:dry` to test the setup.

   ```bash
   pnpm run release:beta:dry
   ```

2. Continue in the development environment:

   Run `pnpm run release:beta` to start the deployment.

   ```bash
   pnpm run release:beta
   ```

3. Still within the development environment:

   Push your changes to the dev branch using `git push --follow-tags origin dev`.

   ```bash
   git push --follow-tags origin dev
   ```

4. Switch to Github:

   Actions will automatically generate a new Docker image with a new tag (for example, v1.0.0-beta.1).

5. Now, move to the `.env/doppler`:

   Update the APP_VERSION environment variable to the new tag (for example, v1.0.0-beta.1).

6. Go back to the development environment:

   Navigate to the deploy directory using `cd deploy/`.

   ```bash
   cd deploy/
   ```

7. Check the changes with `./_deploy_prod.sh diff`.

   ```bash
   ./_deploy_prod.sh diff
   ```

8. Apply the changes to the production environment using `./_deploy_prod.sh apply`.

   ```bash
   ./_deploy_prod.sh apply
   ```

9. Your new version is now deployed to the production environment on [https://theses.bf.uzh.ch/](https://theses.bf.uzh.ch/).

### Restart the app (if only Powerautomate Solution Update)

```bash
# Restart the app
kubectl rollout restart -n thesis-platform deployment thesis-platform
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.de.html) - see the LICENSE file for details.
