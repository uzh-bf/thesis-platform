# Thesis-Platform

This project serves as a platform to facilitate the creation, management, and viewing of academic proposals. The system allows users to create new proposals, view proposal details, manage feedback, and update proposal statuses. It categorizes proposals based on their topic area and differentiates between student and supervisor roles, ensuring a clear and organized workflow.

The motivation behind this project is to offer academic institutions an efficient mechanism to simplify the proposal submission, evaluation, and feedback cycles, thereby facilitating a smoother pairing of students with their respective supervisors.

## Requirements

## Installation

How to install the project:

```bash
# Clone the repository
git clone https://github.com/uzh-bf/thesis-platform.git

# Navigate into the directory
cd thesis-platform

# Install dependencies
npm install
```

❗️Make sure your IP address has access to the database (include IP for Azure DB on [Azure](https://portal.azure.com)).❗️

## Usage

```bash
# Run the web app in developer mode
npm run dev
```

The web app should now be visible on https://localhost:5000.

## Deployment

This section will guide you through the deployment process.

### Pre-requisites

- [Helm](https://helm.sh/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed

### Steps

- (dev): `npm run release:beta:dry` (to test)
- (dev): `npm run release:beta` (to deploy)
- (dev): `git push --follow-tags origin dev` (to push to dev branch)
- (Github): Actions generate a new docker image automatically with a new tag (e.g. v1.0.0-beta.1)
- (.env/doppler): Update the APP_VERSION environment variable to the new tag (e.g. v1.0.0-beta.1)
- (dev): `cd deploy/`
- (dev): `./_deploy_prod.sh diff` (to check the changes)
- (dev): `./_deploy_prod.sh apply` (to deploy to the production environment)
- New version is now deployed to the production environment on [https://theses.bf.uzh.ch/](https://theses.bf.uzh.ch/)

- After testing the new version in production, merge the dev branch into the main branch
- (main): `npm run release:dry` (to test)
- (main): `npm run release` (to deploy)
- (main): `git push --follow-tags origin main` (to push to main branch)
- (Github): Actions generate a new docker image automatically with a new tag (e.g. v1.0.0)
- (.env/doppler): Update the APP_VERSION environment variable to the new tag (e.g. v1.0.0)
- (main): `cd deploy/`
- (main): `./_deploy_prod.sh diff` (to check the changes)
- (main): `./_deploy_prod.sh apply` (to deploy to the production environment)
- New version is now deployed to the production environment on [https://theses.bf.uzh.ch/](https://theses.bf.uzh.ch/)

### Restart the app (if only Powerautomate Solution Update)

```bash
# Restart the app
kubectl rollout restart -n thesis-platform deployment thesis-platform
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.de.html) - see the LICENSE file for details.
