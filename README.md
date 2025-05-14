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

Users can upload any number of files/folders to create a detailed private test framework. The uploaded package must include a shell script named `custom-test.sh`, which contains the code to start the private tests.

A sample custom test is given [here for reference](./custom_test.sh).

### Permissions
The app starts with a login page where the admin has to input a [GitHub Fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). The user must have with `owner` role for the starter-code repo and `Classroom Admin` role on the github-classrooms. 

Set the organization hosting the classroom starter-codes as the `token owner`.  

The token must have the following **read-only** permissions to fetch the required data:
- **Repository Acces**:
  - Administration
  - Attestations
  - Contents

- **Organization Access**:
  - Administration

The token must be generated from an admin account of the classroom. Specifically, the account must:
- Be added as a Classroom Admin in GitHub Classrooms.
- Be the owner of the repository hosting the starter code.

Without adequate permissions from the correct account, the app cannot fetch the required data.

## Build and Run
The apps can be compiled and self hosted in the admin's local machine. All data pertinent to the app, including the custom-test run are stored in the current directory.

### Prerequisites
Following node and npm versions are required for compiling the app.

```shell
$ node -v
v23.11.0

$ npm -v
11.3.0
```

### Build Instructions

**Backend**
To build the backend, go to the `./backend` folder and install requirements.
```shell
cd backend/
npm install
```

Start the backend server
```shell
$ node index.js 
API listening at http://localhost:3000
```

**Frontend**
Go to the `./frontend` folder and install requirements
```shell
cd frontend/
npm install
```

Start the frontend app with
```shell
$ npm run dev

> frontend@0.0.0 dev
> vite


  VITE v6.3.5  ready in 453 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Use any browser to go to `http://localhost:5173/` where you can see the app frontend in action. Create a github fine-grained-token to login into the app and start exploring data.