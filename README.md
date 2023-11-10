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

The web app should now be visible on <https://localhost:5000>.

### Steps

## Deployment

The following instructions will guide you through the deployment process step by step.

### Pre-requisites

Your system should have the following installed:

1. [Helm](https://helm.sh/)
2. [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Deployment steps

Here are the steps you'll need to follow for deployment:

1. Start in the development environment:

   Run the command `npm run release:beta:dry` to test the setup.

   ```bash
   npm run release:beta:dry
   ```

2. Continue in the development environment:

   Run `npm run release:beta` to start the deployment.

   ```bash
   npm run release:beta
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
