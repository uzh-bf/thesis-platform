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

## Usage

```bash
# Run the web app in developer mode
pnpm run dev
```

The web app should now be visible on <https://localhost:3000>.

## Deployment

Deployment is GitOps-based. ArgoCD pulls this repository and renders:

- `deploy/chart_new`
- `deploy/stg_new/values.yaml`
- `deploy/prd_new/values.yaml`
- `deploy/prd_ibw_new/values.yaml`

Do not deploy this app with local Helmfile or envsubst scripts. Runtime secrets come from Infisical through Kubernetes ExternalSecrets.

GitHub Actions build images and open deployment image tag pull requests against the `_new` values files. Merge those pull requests to update the desired state that ArgoCD syncs to the cluster.

### Restart the app (if only Powerautomate Solution Update)

```bash
# Restart the app
kubectl rollout restart -n thesis-platform deployment thesis-platform
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.de.html) - see the LICENSE file for details.
