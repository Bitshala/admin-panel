# Admin Panel

This is a small tool to analyze GitHub Classroom student data. It is useful for educational organizations building courses and assignments with GitHub Classrooms.

## Main Features

### Pages
The app provides easy navigation across multiple classrooms and their student data.

The basic layout of the pages is as follows:
- **Main Page**:
  - Summarizes all classroom data.
  - Allows sorting data by names or scores.
  - Enables filtering data by passing/failing or other scoring criteria.
- **Student Page**:
  - Clicking on a student's name opens their page with all relevant data.
  - Summarizes their scores across multiple classrooms and private test runs (if any).

### Private Test

The app allows uploading multiple test files for classroom assignments. When a student pushes their submission, the app:
1. Clones their forked repository.
2. Runs the private tests locally within the repository context.
3. Reports the scores and test logs in the frontend.

Users can upload any number of files/folders to create a detailed private test framework. The uploaded package must include a shell script named `test.sh`, which contains the code to start the private tests.

### Permissions
The app starts with a login page where the user must input a GitHub token. The token must have the following **read-only** permissions to fetch the required data:

#### GitHub Token Access:
- **Repository**:
  - Administration
  - Metadata
  - Code
  - Issues
  - Pull Requests
- **Organization**:
  - Administration

The token must be generated from an admin account of the classroom. Specifically, the account must:
- Be added as a Classroom Admin in GitHub Classrooms.
- Be the owner of the repository hosting the starter code.

Without adequate permissions from the correct account, the app cannot fetch the required data.

## Try It Live

A public instance of the app is available [here]() for anyone to use. Add your GitHub access token and explore.

**Note**: For security and privacy reasons, the app does not cache any data. This may cause slight delays in operation.

If you are concerned about the privacy of your classroom data, you can self-host this application with all its features.

## Self-Hosting

### Prerequisites

### Build Instructions

### Run Instructions



