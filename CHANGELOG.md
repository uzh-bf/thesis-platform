# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0-beta.48](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.47...v1.1.0-beta.48) (2025-10-15)

## [1.1.0-beta.47](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.46...v1.1.0-beta.47) (2025-10-15)


### Features

* add API endpoint to create or update users with supervisor role ([#65](https://github.com/uzh-bf/thesis-platform/issues/65)) ([b0e0988](https://github.com/uzh-bf/thesis-platform/commit/b0e098851c6b5e8ce64cec0ffdf052989fa11ce8))
* add conditional logout flow for dev/prod authentication providers ([5068a82](https://github.com/uzh-bf/thesis-platform/commit/5068a82bdd03009648bbea2692e96bbe695a3d32))
* add department field and uncomment sample proposal creation in seed script ([475a805](https://github.com/uzh-bf/thesis-platform/commit/475a8050852915174062ff28fd578d5b80a97fd6))


### Bug Fixes

* correct service user name in IBW seed data to match production ([832ebfe](https://github.com/uzh-bf/thesis-platform/commit/832ebfe2973771593d1c8c6dd0d18f8fbe84e641))


### Refactors

* remove commented out sample proposal creation code ([e6da7fe](https://github.com/uzh-bf/thesis-platform/commit/e6da7fe71375c52fa8efa30c54890a1beeb71747))
* simplify user seeding by removing prompts and adding predefined supervisors ([3adea3e](https://github.com/uzh-bf/thesis-platform/commit/3adea3ec3ac931c8542e6bf8eb5827496020e9e9))

## [1.1.0-beta.46](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.45...v1.1.0-beta.46) (2025-10-09)


### Features

* add additional faculty members to seed data for IBW department ([e5d4cbe](https://github.com/uzh-bf/thesis-platform/commit/e5d4cbeffa1d46d2351d0ca6fd46d79f2dd0b044))
* implement pre-defined supervisor accounts and improve OAuth account linking ([4830305](https://github.com/uzh-bf/thesis-platform/commit/4830305300276149643602895a1e90e0ddfe1cc4))

## [1.1.0-beta.45](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.44...v1.1.0-beta.45) (2025-10-03)


### Features

* implement Microsoft Entra ID single sign-out flow ([f03be2f](https://github.com/uzh-bf/thesis-platform/commit/f03be2ff622e5f667fba69f460899de953953636))

## [1.1.0-beta.44](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.43...v1.1.0-beta.44) (2025-09-30)


### Features

* auto-assign department to new users during account creation ([d51fddc](https://github.com/uzh-bf/thesis-platform/commit/d51fddc11de46cab1b7eabca261afb0471a6fe33))

## [1.1.0-beta.43](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.42...v1.1.0-beta.43) (2025-09-29)


### Bug Fixes

* reduce query stale time to 0 for always-fresh data ([e0f714e](https://github.com/uzh-bf/thesis-platform/commit/e0f714e0f828756154f0c84148e0f87789f9f0fb))

## [1.1.0-beta.42](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.41...v1.1.0-beta.42) (2025-09-29)


### Features

* enable form reinitialization in AcceptProposalForm component ([6c459bc](https://github.com/uzh-bf/thesis-platform/commit/6c459bcdd7101512fa2a42e175b25ea54fa1122e))

## [1.1.0-beta.41](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.40...v1.1.0-beta.41) (2025-09-26)

## [1.1.0-beta.40](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.39...v1.1.0-beta.40) (2025-09-26)


### Other

* update TopicAreasIBW enum labels to use ampersands and commas ([2769c39](https://github.com/uzh-bf/thesis-platform/commit/2769c39199b6e3dbc50a2645399f6bc851498da3))

## [1.1.0-beta.39](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.38...v1.1.0-beta.39) (2025-09-23)


### Bug Fixes

* remove quotes from NEXT_PUBLIC_DEPARTMENT_LONG_NAME env variable in workflow ([fa8a0dc](https://github.com/uzh-bf/thesis-platform/commit/fa8a0dc0cb99ef08556969b3a1e4f1e28f43bc82))

## [1.1.0-beta.38](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.37...v1.1.0-beta.38) (2025-09-23)


### Features

* conditionally show FAQ button based on department name env var ([6feb0ca](https://github.com/uzh-bf/thesis-platform/commit/6feb0ca4a7fce35404b16ddb7c843d9bc05a9e0b))
* update IBW topic areas with specific business categories ([8ff54ab](https://github.com/uzh-bf/thesis-platform/commit/8ff54ab2b00f089500ab65dd8d194bcda166c886))


### Bug Fixes

* remove timezone offset when parsing planned start date for proposal applications ([bd3bb23](https://github.com/uzh-bf/thesis-platform/commit/bd3bb2385c60b6e3c2d156ac47eeb2dfbfc92f5c))

## [1.1.0-beta.37](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.36...v1.1.0-beta.37) (2025-09-17)


### Bug Fixes

* **ci:** make sure we build ibw and df platforms separately ([6b4d7ae](https://github.com/uzh-bf/thesis-platform/commit/6b4d7ae68044ca41469b94ede7534d200ddf13c4))

## [1.1.0-beta.36](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.35...v1.1.0-beta.36) (2025-09-16)

## [1.1.0-beta.35](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.34...v1.1.0-beta.35) (2025-09-16)


### Features

* add additional student comment and consent fields to seed data ([46fd542](https://github.com/uzh-bf/thesis-platform/commit/46fd5428db991967ae0692147ece4c6254f77941))
* add CleverReach API integration via Power Automate ([#61](https://github.com/uzh-bf/thesis-platform/issues/61)) ([b43b5c3](https://github.com/uzh-bf/thesis-platform/commit/b43b5c34da4e3e891666a3e0d645b3fa7a9bc492))
* add concurrent ngrok tunnel for local development ([6bd770c](https://github.com/uzh-bf/thesis-platform/commit/6bd770cd49374961758841edf138f2e7cc93acc8))
* Add department column to DB ([#60](https://github.com/uzh-bf/thesis-platform/issues/60)) ([4ed24bb](https://github.com/uzh-bf/thesis-platform/commit/4ed24bb57e0615203be8ea62490aa9d01d4f5f65))
* add IBW environment configuration and scripts with localtunnel support ([88c11c0](https://github.com/uzh-bf/thesis-platform/commit/88c11c07c8146478bf11bd982bfda3707192320e))
* add responsible table seeding and test student proposal data ([3bfb904](https://github.com/uzh-bf/thesis-platform/commit/3bfb90458941c38b3fd172f94ee6496b27def13e))
* Decline individual supervisor proposal applications ([#62](https://github.com/uzh-bf/thesis-platform/issues/62)) ([6ea6371](https://github.com/uzh-bf/thesis-platform/commit/6ea6371edcfcd6cf6917f78a05120c6dd40bf0e4))
* enhance seed script prompt with user email and name from env vars ([c61c174](https://github.com/uzh-bf/thesis-platform/commit/c61c174e79437115bfca68dfe770bc4526f003fa))


### Bug Fixes

* add horizontal scrolling to proposal applications table ([d94049b](https://github.com/uzh-bf/thesis-platform/commit/d94049b70b07033312112930d75a9ef6048be1d9))
* initialize readline interface before use and remove unused application status seeding ([51b1a4b](https://github.com/uzh-bf/thesis-platform/commit/51b1a4bacef6b7b8b28f4be30668637cc288096c))
* update service user name and email in seed data ([c0c35c6](https://github.com/uzh-bf/thesis-platform/commit/c0c35c670f9a9d7f05db9a47ac94ee5ef266d765))
* update thesis FAQ link for non-supervisors ([a1b0bc6](https://github.com/uzh-bf/thesis-platform/commit/a1b0bc6bfa6c0a69f873dc0f26637be9b3c3b3e3))


### Refactors

* improve database seeding with better logging and error handling ([04a23a2](https://github.com/uzh-bf/thesis-platform/commit/04a23a2f327557e6049f76230ecdb94c38bfd7b5))


### Other

* adjust layout and width of student proposals header and select filter ([d6db072](https://github.com/uzh-bf/thesis-platform/commit/d6db072582060621bbbdef3bd036084efff46a57))

## [1.1.0-beta.34](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.33...v1.1.0-beta.34) (2025-04-10)


### Bug Fixes

* Ensure My Active Proposals filter only shows proposals supervised by current user ([#54](https://github.com/uzh-bf/thesis-platform/issues/54)) ([5d23d89](https://github.com/uzh-bf/thesis-platform/commit/5d23d89d39130472a2ec7666fd6e0c18b4266241))

## [1.1.0-beta.33](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.32...v1.1.0-beta.33) (2025-04-10)


### Features

* Add "My Active Proposals" filter and visual indicators for proposal status ([#53](https://github.com/uzh-bf/thesis-platform/issues/53)) ([5ee6383](https://github.com/uzh-bf/thesis-platform/commit/5ee638382a121f7bf06413568b65bbbb853c48f6))

## [1.1.0-beta.32](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.30...v1.1.0-beta.32) (2025-02-24)


### Bug Fixes

* enumeration formatting ([#50](https://github.com/uzh-bf/thesis-platform/issues/50)) ([ccc1dd4](https://github.com/uzh-bf/thesis-platform/commit/ccc1dd45b6b920ca9d243e21699a1fe5ed5b95ef))

## [1.1.0-beta.31](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.30...v1.1.0-beta.31) (2025-02-24)


### Bug Fixes

* enumeration formatting ([#50](https://github.com/uzh-bf/thesis-platform/issues/50)) ([ccc1dd4](https://github.com/uzh-bf/thesis-platform/commit/ccc1dd45b6b920ca9d243e21699a1fe5ed5b95ef))

## [1.1.0-beta.30](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.29...v1.1.0-beta.30) (2025-01-27)


### Enhancements

* Design improvements ([#49](https://github.com/uzh-bf/thesis-platform/issues/49)) ([e9cab27](https://github.com/uzh-bf/thesis-platform/commit/e9cab27090495288beb7b6176e61e38f2d291c1d))

## [1.1.0-beta.29](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.28...v1.1.0-beta.29) (2025-01-27)


### Enhancements

* Date sorting & 3 weeks in marking ([#48](https://github.com/uzh-bf/thesis-platform/issues/48)) ([3a025c7](https://github.com/uzh-bf/thesis-platform/commit/3a025c792d52ab11c1a8054555e101fdcf64ad5f))

## [1.1.0-beta.28](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.27...v1.1.0-beta.28) (2025-01-27)


### Enhancements

* further attachments for student working again + design stuff ([#47](https://github.com/uzh-bf/thesis-platform/issues/47)) ([b5e6c26](https://github.com/uzh-bf/thesis-platform/commit/b5e6c261d798bcc3b8468ea14b2216d149869b2f))

## [1.1.0-beta.27](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.26...v1.1.0-beta.27) (2025-01-24)


### Bug Fixes

* flowSecret added ([#46](https://github.com/uzh-bf/thesis-platform/issues/46)) ([18e3344](https://github.com/uzh-bf/thesis-platform/commit/18e3344ee66a083998f6f878bc487c3867ec1bf1))

## [1.1.0-beta.26](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.25...v1.1.0-beta.26) (2025-01-24)


### Enhancements

* replace DB connectors by http (Proposal posting) ([#45](https://github.com/uzh-bf/thesis-platform/issues/45)) ([d1d9191](https://github.com/uzh-bf/thesis-platform/commit/d1d919161bc989a911b761a5d3d08c04e6a2cd2d))

## [1.1.0-beta.25](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.24...v1.1.0-beta.25) (2025-01-23)


### Enhancements

* replace DB connector getProvidedFeedbackEntries ([4dfb93e](https://github.com/uzh-bf/thesis-platform/commit/4dfb93e4ce2582aaafa756fbe382803e66474955))

## [1.1.0-beta.24](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.23...v1.1.0-beta.24) (2025-01-23)


### Enhancements

* find by personResponsibleName ([c2ceb6c](https://github.com/uzh-bf/thesis-platform/commit/c2ceb6c51a8053cef3855006ae1988cbf69397e5))

## [1.1.0-beta.23](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.22...v1.1.0-beta.23) (2025-01-23)


### Enhancements

* DB connectors replaced by http requests (Feedback Flow) ([#44](https://github.com/uzh-bf/thesis-platform/issues/44)) ([774765b](https://github.com/uzh-bf/thesis-platform/commit/774765b62983e9df65730015b70d14fb262d770d))

## [1.1.0-beta.22](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.20...v1.1.0-beta.22) (2025-01-23)


### Bug Fixes

* WAITING_FOR_STUDENT status treated the same as OPEN for statusKey ([#43](https://github.com/uzh-bf/thesis-platform/issues/43)) ([8e2a38c](https://github.com/uzh-bf/thesis-platform/commit/8e2a38cf4289ad44a653c4debe7fd658ee2716a8))

## [1.1.0-beta.21](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.20...v1.1.0-beta.21) (2025-01-23)


### Bug Fixes

* waiting for student status treated the same as OPEN ([6a1968f](https://github.com/uzh-bf/thesis-platform/commit/6a1968fe77cc78e40e457ce79d5f4cc350e8b2f2))

## [1.1.0-beta.20](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.19...v1.1.0-beta.20) (2025-01-22)


### Enhancements

* createProposalApplication procedure with http ([#42](https://github.com/uzh-bf/thesis-platform/issues/42)) ([0c2e23a](https://github.com/uzh-bf/thesis-platform/commit/0c2e23ab399e4469e488fb833046dd750211f0fa))

## [1.1.0-beta.19](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.18...v1.1.0-beta.19) (2025-01-22)


### Enhancements

* replace DB connectors through http requests for Thesis Application Acceptance ([#41](https://github.com/uzh-bf/thesis-platform/issues/41)) ([8d254cf](https://github.com/uzh-bf/thesis-platform/commit/8d254cfb8ccca4a873ca416dba78fea063b90a89))

## [1.1.0-beta.18](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.17...v1.1.0-beta.18) (2025-01-20)


### Enhancements

* Student Email Reminder ([#40](https://github.com/uzh-bf/thesis-platform/issues/40)) ([161f88c](https://github.com/uzh-bf/thesis-platform/commit/161f88caa57803e438f2cd3a4df26d82c9a90701))

## [1.1.0-beta.17](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.16...v1.1.0-beta.17) (2025-01-10)


### Features

* **prisma:** add latestSubmissionDate to admin info table ([#39](https://github.com/uzh-bf/thesis-platform/issues/39)) ([d5728d8](https://github.com/uzh-bf/thesis-platform/commit/d5728d82b5df558185f795c0bde08e45e0335f3d))

## [1.1.0-beta.16](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.15...v1.1.0-beta.16) (2024-12-17)


### Enhancements

* add ARCHIVED status to prisma schema, clean up seed ([#37](https://github.com/uzh-bf/thesis-platform/issues/37)) ([221716e](https://github.com/uzh-bf/thesis-platform/commit/221716e0997d251522128fe9e67a60aa09bb6198))
* add latest package-lock.json ([96b7646](https://github.com/uzh-bf/thesis-platform/commit/96b7646248649ee141ac16fc3c01fab68f54bd08))

## [1.1.0-beta.15](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.14...v1.1.0-beta.15) (2024-10-22)


### Bug Fixes

* FAQ page link ([7c6e33e](https://github.com/uzh-bf/thesis-platform/commit/7c6e33e072dffcf2006077302222a4a235a81930))

## [1.1.0-beta.14](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.13...v1.1.0-beta.14) (2024-08-05)


### Bug Fixes

* add meta for openapi endpoints ([c6f5d84](https://github.com/uzh-bf/thesis-platform/commit/c6f5d843ea1eaeb4e503ad0f12f16e777019a7b9))

## [1.1.0-beta.13](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.12...v1.1.0-beta.13) (2024-08-05)


### Enhancements

* add feedback mechanism in openapi endpoints ([70c7c11](https://github.com/uzh-bf/thesis-platform/commit/70c7c1175752915bee5187449e734023eb4f6d9b))

## [1.1.0-beta.12](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.11...v1.1.0-beta.12) (2024-08-05)


### Bug Fixes

* don't expect a date with zod ([5254da2](https://github.com/uzh-bf/thesis-platform/commit/5254da2e65bc4fac7b73d39ba3f05d0b01659968))

## [1.1.0-beta.11](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.10...v1.1.0-beta.11) (2024-08-05)


### Bug Fixes

* log error ([06d287d](https://github.com/uzh-bf/thesis-platform/commit/06d287d82c31e224d3d4691cd95a81fc0d4480b2))

## [1.1.0-beta.10](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.9...v1.1.0-beta.10) (2024-08-05)


### Bug Fixes

* date parsing for plannedStartAt ([516097f](https://github.com/uzh-bf/thesis-platform/commit/516097f64cf2b2211174748b013efff5326d16a3))

## [1.1.0-beta.9](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.8...v1.1.0-beta.9) (2024-08-05)


### Bug Fixes

* date parsing and url validation for proposal submission ([b66e0d6](https://github.com/uzh-bf/thesis-platform/commit/b66e0d6ecb9deea3ebd36c3c835b7df96726aeb0))

## [1.1.0-beta.8](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.7...v1.1.0-beta.8) (2024-08-05)


### Bug Fixes

* add openapi for trpc ([c2e90c2](https://github.com/uzh-bf/thesis-platform/commit/c2e90c2a6a0592b45d162114387cf70b4e7cfd14))

## [1.1.0-beta.7](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.6...v1.1.0-beta.7) (2024-08-05)

### Bug Fixes

- add api endpoint for persisting a submission ([c649712](https://github.com/uzh-bf/thesis-platform/commit/c64971220353796e69efd85e045d357d50d75a36))

## [1.1.0-beta.6](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.5...v1.1.0-beta.6) (2024-03-21)

## [1.1.0-beta.5](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.4...v1.1.0-beta.5) (2024-03-21)

## [1.1.0-beta.4](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.3...v1.1.0-beta.4) (2024-03-20)

### Bug Fixes

- **app:** personResponsible as optional in axios post ([a0edd03](https://github.com/uzh-bf/thesis-platform/commit/a0edd031fe8f8983a846e6deeaddf14a5074c8c0))

## [1.1.0-beta.3](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.2...v1.1.0-beta.3) (2024-03-20)

## [1.1.0-beta.2](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.1...v1.1.0-beta.2) (2024-03-13)

### Features

- **app/solutions:** add proposal info to admin table on accept - application & proposal ([#31](https://github.com/uzh-bf/thesis-platform/issues/31)) ([6805004](https://github.com/uzh-bf/thesis-platform/commit/68050049c09da818e44baaaba6a8fe8ef4eabcb9))

## [1.1.0-beta.1](https://github.com/uzh-bf/thesis-platform/compare/v1.1.0-beta.0...v1.1.0-beta.1) (2024-03-13)

## [1.1.0-beta.0](https://github.com/uzh-bf/thesis-platform/compare/v1.0.1-beta.2...v1.1.0-beta.0) (2024-03-13)

### Features

- **app:** Add responsible on accept student proposal ([#30](https://github.com/uzh-bf/thesis-platform/issues/30)) ([ec53e01](https://github.com/uzh-bf/thesis-platform/commit/ec53e0162eede4defa31ca629a4f02cfe8b2d00c))

### [1.0.1-beta.2](https://github.com/uzh-bf/thesis-platform/compare/v1.0.1-beta.1...v1.0.1-beta.2) (2024-03-13)

### [1.0.1-beta.1](https://github.com/uzh-bf/thesis-platform/compare/v1.0.1-beta.0...v1.0.1-beta.1) (2024-03-12)

### [1.0.1-beta.0](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0...v1.0.1-beta.0) (2024-03-11)

## [1.0.0](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-rc.0...v1.0.0) (2024-03-04)

### Enhancements

- add NEXT_PUBLIC_FOOTER_COPYRIGHT to customize footer text, add UPGRADE_NOTES.md ([#26](https://github.com/uzh-bf/thesis-platform/issues/26)) ([e7165c9](https://github.com/uzh-bf/thesis-platform/commit/e7165c9837fd6b41b7c7289d81f4813e0a1db49a))

## [1.0.0-rc.0](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.12...v1.0.0-rc.0) (2024-02-28)

## [1.0.0-beta.12](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-02-27)

## [1.0.0-beta.11](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.10...v1.0.0-beta.11) (2024-02-15)

## [1.0.0-beta.10](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-01-24)

### Features

- **prisma:** extended db by admin info table ([#23](https://github.com/uzh-bf/thesis-platform/issues/23)) ([867dc63](https://github.com/uzh-bf/thesis-platform/commit/867dc631fa31da71f854608eaea9f9798c4bc3c1))

## [1.0.0-beta.9](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.8...v1.0.0-beta.9) (2023-12-18)

### Features

- **app:** Developer role added that can see applications on all supervisor proposals ([#21](https://github.com/uzh-bf/thesis-platform/issues/21)) ([d61fabd](https://github.com/uzh-bf/thesis-platform/commit/d61fabd2479b063882ad05ed3d8ffc1a0b9ebe21))

### Bug Fixes

- **app:** check against all emails on multiple feedbacks ([2219cfe](https://github.com/uzh-bf/thesis-platform/commit/2219cfe8949a27121dfdd28812810f4617507d45))

## [1.0.0-beta.8](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.7...v1.0.0-beta.8) (2023-12-14)

### Enhancements

- **prisma:** Timestamps added for UserProposalSupervision and UserProposalFeedback ([#20](https://github.com/uzh-bf/thesis-platform/issues/20)) ([ee99961](https://github.com/uzh-bf/thesis-platform/commit/ee99961454ee7634ce10a6a9a1b94f4b1f09bab2))

## [1.0.0-beta.7](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2023-12-13)

### Bug Fixes

- **app:** supervisedBy unassigned resolved ([#18](https://github.com/uzh-bf/thesis-platform/issues/18)) ([3f16447](https://github.com/uzh-bf/thesis-platform/commit/3f16447d32921fff9f31d888f86319db054cf50a))

## [1.0.0-beta.6](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2023-12-07)

### Bug Fixes

- **solutions:** AreasOfInterestV2 instead of col AreasOfInterest ([#19](https://github.com/uzh-bf/thesis-platform/issues/19)) ([7ea2467](https://github.com/uzh-bf/thesis-platform/commit/7ea246709564405385acdb3a9e0ed81d59ef70af))

## [1.0.0-beta.5](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.4...v1.0.0-beta.5) (2023-12-07)

### Enhancements

- **solutions:** new thesisMarket topic areas structure and flow secret added to actionable messages ([#17](https://github.com/uzh-bf/thesis-platform/issues/17)) ([b29bc5f](https://github.com/uzh-bf/thesis-platform/commit/b29bc5fbaecf7228133b8a1f09ba3686af5d1945))

## [1.0.0-beta.4](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2023-12-05)

### Enhancements

- **app:** show supervisor proposals for all Supervisors but only show applications for owner/supervisor ([#16](https://github.com/uzh-bf/thesis-platform/issues/16)) ([1ea8187](https://github.com/uzh-bf/thesis-platform/commit/1ea818728d5c23f3c376a9a3b049575fbdfe6a8f))

## [1.0.0-beta.3](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2023-11-30)

### Bug Fixes

- add rollback migration for timestamps ([d012897](https://github.com/uzh-bf/thesis-platform/commit/d012897468c674bb46ae8bad9483e3c58a55c1e8))

## [1.0.0-beta.2](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2023-11-30)

### Features

- implement Proposal Application Acceptance Workflow ([#12](https://github.com/uzh-bf/thesis-platform/issues/12)) ([3cae829](https://github.com/uzh-bf/thesis-platform/commit/3cae829516e416ad8db423d9b37f0b79be4b9f99))

### Bug Fixes

- **deploy:** env config added ([35607ed](https://github.com/uzh-bf/thesis-platform/commit/35607ed7d6a777a82f499f6b0b528126f40a5365))
- **deploy:** env config updated ([669a00b](https://github.com/uzh-bf/thesis-platform/commit/669a00bd863697c14763259323ba12b84a60fa90))
- **deploy:** use APP_URL instead of NEXT_PUBLIC_APP_URL ([2ff4483](https://github.com/uzh-bf/thesis-platform/commit/2ff4483ab9afa37246d13ffff251990001d7ca3f))
- **prisma:** [@id](https://github.com/id) instead of [@unique](https://github.com/unique) for VerificationToken ([d4d842a](https://github.com/uzh-bf/thesis-platform/commit/d4d842a8ddc89411858c162276dd8da76b86a5af))

### Enhancements

- **app:** filter & proposalId to url ([#11](https://github.com/uzh-bf/thesis-platform/issues/11)) ([b73f12a](https://github.com/uzh-bf/thesis-platform/commit/b73f12a8b783ae1a6500f06c86d6ef3e82b07f95))
- **prisma:** timestamps added for feedbacks and supervision ([62cbf0b](https://github.com/uzh-bf/thesis-platform/commit/62cbf0b1e46930cca5fa71e1e76a4e74d9a45c22))
- **solution:** FlowSecret added for flows with HTTP request and updated solutions folder ([#15](https://github.com/uzh-bf/thesis-platform/issues/15)) ([20815d1](https://github.com/uzh-bf/thesis-platform/commit/20815d11d8813b7360e55c3089ce0b1f5978441e))

## [1.0.0-beta.1](https://github.com/uzh-bf/thesis-platform/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2023-11-09)

## 1.0.0-beta.0 (2023-11-09)

### Features

- add tentative accept form ([a48b0a0](https://github.com/uzh-bf/thesis-platform/commit/a48b0a0b61e69efec9d4b0c15cf299ad2a117bb0))
- **app:** Proposal filtering ([#7](https://github.com/uzh-bf/thesis-platform/issues/7)) ([9f61c15](https://github.com/uzh-bf/thesis-platform/commit/9f61c1590faadfa65b1b852a78915cfe6024de68))

### Bug Fixes

- add missing imports ([e477650](https://github.com/uzh-bf/thesis-platform/commit/e47765082006c1243749df610e628340c9890b5a))
- convert user image to db.Text ([0785ad6](https://github.com/uzh-bf/thesis-platform/commit/0785ad64091982ca5f17f635833ae902b241ae65))
- decline proposal text adjustment ([5ee2cbc](https://github.com/uzh-bf/thesis-platform/commit/5ee2cbcbf0550fe5dd5e5ecb918cddb2c27cf242))
- ensure initial active works ([26dd8b9](https://github.com/uzh-bf/thesis-platform/commit/26dd8b9c04faf79a8dedbbd090ba8d9b00ce27de))
- ensure latest is built only on dev ([874b66c](https://github.com/uzh-bf/thesis-platform/commit/874b66c95f007a2bbfe4de36045302ffd0a93eca))
- ensure login button is available on supervisor view ([16e9145](https://github.com/uzh-bf/thesis-platform/commit/16e9145ebf2350c0c08f5339c7ae3d20169c03de))
- make fullName optional ([c091a25](https://github.com/uzh-bf/thesis-platform/commit/c091a258ab070cef83881a25a47697c7817ea2d7))
- only display azure login if not empty string ([0bfcd11](https://github.com/uzh-bf/thesis-platform/commit/0bfcd1106b7bee3540402a5ddfc9e1a9c09d56fc))
- push stable in build-stable ([1383cec](https://github.com/uzh-bf/thesis-platform/commit/1383cecfc94da0d6548fca2ff88123b5f930939e))
- received feedbacks is undefined ([5895a57](https://github.com/uzh-bf/thesis-platform/commit/5895a57834e0d18d899fb2adcf5ffc78b7afac6f))
- remove doppler dependency from generate command ([5dfffff](https://github.com/uzh-bf/thesis-platform/commit/5dfffff4bfa6d6ee7cc62a30330455fc2d9b9eee))
- remove embed=true from student and supervisor proposal form ([1e1a55e](https://github.com/uzh-bf/thesis-platform/commit/1e1a55e59cf44499b1a28050d57164f47dbad5f4))
- restore old package versions for trpc and auth ([fe01dc2](https://github.com/uzh-bf/thesis-platform/commit/fe01dc268558da17e53575a1b3e01250b1c2492a))
- show auth0 everywhere except production, hide azure login if env not set ([d7be55d](https://github.com/uzh-bf/thesis-platform/commit/d7be55db0404223b03fad74fb02f4b2ff683c988))
- show full name of student instead of status on card ([17fa54e](https://github.com/uzh-bf/thesis-platform/commit/17fa54ea4164920cfda569eb92b295bce5c7089d))
- show supervisor name on supervisor proposals ([9222eed](https://github.com/uzh-bf/thesis-platform/commit/9222eede212828d85eb09845199fc6fa79cdddb4))
- source sans ([f12f63a](https://github.com/uzh-bf/thesis-platform/commit/f12f63adbe33eab0096d7aeaf7dbf893717d9b38))
- upgrade next-auth ([fcfd058](https://github.com/uzh-bf/thesis-platform/commit/fcfd05856054cca0cda6afa597d724c3bc8e91ad))
- use AUTH0 if defined ([2075836](https://github.com/uzh-bf/thesis-platform/commit/20758363d59f8a4a6bcc19b9e360bab15cb6dbe4))
- use different create context ([bee2940](https://github.com/uzh-bf/thesis-platform/commit/bee29401dd0995b8da00eaeec82ab1f5a6612cec))
- use PROPOSAL_FEEDBACK_URL in backend ([02768fb](https://github.com/uzh-bf/thesis-platform/commit/02768fbaa47c2a62c07e28fd932fdab5d2d45575))
- use stage as default NODE_ENV ([dc4bc90](https://github.com/uzh-bf/thesis-platform/commit/dc4bc9094157a678007112e5d74e3e38cd316ffa))

### Other

- .next/ ([d0edb24](https://github.com/uzh-bf/thesis-platform/commit/d0edb2416f42bb3605aee6f5788836f44ae05d82))
- app / api build command ([0b71866](https://github.com/uzh-bf/thesis-platform/commit/0b7186644f8d80db5a6e1f9dd36605fa2dfe81a3))
- continued ([0a8c80e](https://github.com/uzh-bf/thesis-platform/commit/0a8c80efe10b7361033456fffdede7e02aa0c483))
- https removed ([c9d4842](https://github.com/uzh-bf/thesis-platform/commit/c9d484238c2e48cd233ed1b60d9c2a8b361b49b0))
- https://github.com/Azure/static-web-apps/issues/1034 ([a9b968f](https://github.com/uzh-bf/thesis-platform/commit/a9b968f9482f64223a0703a44ffeb355487e68c4))
- next export ([e460da7](https://github.com/uzh-bf/thesis-platform/commit/e460da77d424dd8f0aebaf7c3e17cf4376ca8c48))
- next standalone ([789389e](https://github.com/uzh-bf/thesis-platform/commit/789389ea51dc73f975bc008525b72d263d0e5aeb))
- production env ([b86a414](https://github.com/uzh-bf/thesis-platform/commit/b86a414ade9517d8d67ea8a16d8ca112a05c9c19))
- progress ([0957b3d](https://github.com/uzh-bf/thesis-platform/commit/0957b3d400bb1b3371d5473f52af521fbb0e18b3))
- skip app build ([63f859c](https://github.com/uzh-bf/thesis-platform/commit/63f859c60a3bdb5782f0be161133533bff4d5db4))
- standalone ([34991c3](https://github.com/uzh-bf/thesis-platform/commit/34991c37c44cec28bb47279b9d63e8ae277090f9))
- student application form ([6418a8a](https://github.com/uzh-bf/thesis-platform/commit/6418a8a0305fc634d8b80e51106028df51849809))

### Dependencies

- downgrade next ([c9b1e73](https://github.com/uzh-bf/thesis-platform/commit/c9b1e73fbb59330af16b5144132f63b0e345875e))
- upgrade all packages ([cd4aef8](https://github.com/uzh-bf/thesis-platform/commit/cd4aef86a98b4cfd6ccb30672640226b869720b1))
- upgrade next ([ffb56a0](https://github.com/uzh-bf/thesis-platform/commit/ffb56a058543fe9d37c1ed2a4a3c3b18aeefb95d))
- upgrade prisma and use consistent versions ([5d8f139](https://github.com/uzh-bf/thesis-platform/commit/5d8f1391b5849b59c470331c895cc978da85f908))
- upgrade to next 13 ([e9502df](https://github.com/uzh-bf/thesis-platform/commit/e9502dfe95e816d0ed5592c93fd3b844f287ecef))

### Deployment

- add staging deployment script ([8dda251](https://github.com/uzh-bf/thesis-platform/commit/8dda251428191bd707a8571800397e0e1ca64a38))

### Refactors

- split up into components with props ([#2](https://github.com/uzh-bf/thesis-platform/issues/2)) ([ba3cf3f](https://github.com/uzh-bf/thesis-platform/commit/ba3cf3f6fd0f88fa1178c1584e8d0ca41ec502cd))

### Build and CI

- add .next/standalone as output_location ([178c6e1](https://github.com/uzh-bf/thesis-platform/commit/178c6e1e91d1be829b134d369e4325f0615df43c))
- add Azure Static Web Apps workflow file ([1272451](https://github.com/uzh-bf/thesis-platform/commit/1272451d8e9feb3e12de3180591cb50660f30751))
- add Azure Static Web Apps workflow file ([a5a5b22](https://github.com/uzh-bf/thesis-platform/commit/a5a5b226e6e8363a8b5a8c695ba6d7045aaae06d))
- add docker build to gitlab ci ([0e493b7](https://github.com/uzh-bf/thesis-platform/commit/0e493b7f0756e190a23936fe6927db0e61d25828))
- build stable image ([2947cf0](https://github.com/uzh-bf/thesis-platform/commit/2947cf0674714679b40e3dd520b899a389d34de5))
- comment pull request ([74fa23c](https://github.com/uzh-bf/thesis-platform/commit/74fa23cafe8de813908ec17c84fd330876d664ae))
- dont replace .env.production ([c0e0db7](https://github.com/uzh-bf/thesis-platform/commit/c0e0db74b5da3de2cc48ebbf4efaa30b0543c928))
- remove tags in CI ([11f6e9d](https://github.com/uzh-bf/thesis-platform/commit/11f6e9d0fa3913bb7876bf2edf41ff4b81df860c))
- rename .env.stage to .env.production instead of injecting NODE_ENV ([9102415](https://github.com/uzh-bf/thesis-platform/commit/9102415322ef2fb4db333b46cee997210ed0c9c0))

### Enhancements

- add time frame to DB schema ([36a1095](https://github.com/uzh-bf/thesis-platform/commit/36a1095be21f74054337feefd4e4bf1ce0912e03))
- add timeFrame and use proposalId from query to initialize proposal details ([9c55ab7](https://github.com/uzh-bf/thesis-platform/commit/9c55ab7f4a8c118cf4f5cc12a676b8b193b13e56))
- add very simple footer ([5df0211](https://github.com/uzh-bf/thesis-platform/commit/5df0211e3ce3ab206f108322b41994effbff1b2e))
- **app:** improve display of application details with modal ([#6](https://github.com/uzh-bf/thesis-platform/issues/6)) ([e897848](https://github.com/uzh-bf/thesis-platform/commit/e89784800fd6d991a46cb2e2c823c49dde5f082e))
- **app:** store provided feedback in session storage ([#5](https://github.com/uzh-bf/thesis-platform/issues/5)) ([59a034b](https://github.com/uzh-bf/thesis-platform/commit/59a034ba4cd445ce1e6e1352a192527d65d4c933))
- display existing feedbacks to phds ([0d07b2f](https://github.com/uzh-bf/thesis-platform/commit/0d07b2f1d0d15b3065ea4c46c3fe47a20eefef23))
- open ms forms in new tab ([cb7ef98](https://github.com/uzh-bf/thesis-platform/commit/cb7ef98673f60c02a08bd1e7059c36ab50ff49b8))
- **prisma:** make user proposal many-to-many explicit ([f1a690d](https://github.com/uzh-bf/thesis-platform/commit/f1a690dcf5edbcb5377a04b4ef5b65035ae7eb7d))
- update frontend layout of header and proposal cards ([04b72dc](https://github.com/uzh-bf/thesis-platform/commit/04b72dcf06cc79d07d9df690561a4a2ccfdb03ed))
- use azure ad and [@db](https://github.com/db).Text ([de0ed77](https://github.com/uzh-bf/thesis-platform/commit/de0ed77a43c1597a8519abd31f017b528bba070e))
