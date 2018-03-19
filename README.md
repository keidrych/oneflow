# OneFlow

This is a CLI driven NPM (and/or) *automatic* GitHub Release manager following the [OneFlow](http://endoflineblog.com/oneflow-a-git-branching-model-and-workflow) approach to Git Branch Management.

For those unfamilliar, **OneFlow** takes the best practice approaches of [Trunk Based Development](https://trunkbaseddevelopment.com/) & [Git Flow](http://nvie.com/posts/a-successful-git-branching-model/) and streamlines them in a way that CI releases approaches i.e. [Semantic Release](https://www.npmjs.com/package/semantic-release) are still supported along with complex Enterprise release requirements.

All information on operation is available via the CLI itself, this documentation helps with getting familar with the commands.

## Deployment

### Essentials

**OneFlow** needs access to GitHub and optionally NPM. 

- For GitHub Access a [Personal Access Token](https://github.com/settings/tokens) is needed with `repo only` access.
- For Optional NPM its necessary to login to your user account via the terminal, **OneFlow** will automatically use this config information. Information on logging into NPM can be found at [Publishing NPM Packages](https://docs.npmjs.com/getting-started/publishing-npm-packages)
- Angular Commit Log Styling is necessary as SemVer bumps for branches and releases are automatically determined via [Standard Version](https://github.com/conventional-changelog/standard-version)

### ENV's

While these values can be passed into the command line, its more convenient to assign them globally.

- GITHUB_TOKEN: Personal Access Token for releasing to GitHub {Required}
- GITHUB_ENDPOINT: To Support GitHub Enterprise. { Default: https://api.github.com }

### Installing

Global or Local installation are possible: 
**For Global**
```
npm i -g @tayloredtechnology/oneflow
```
**OneFlow** is now available via `of` or `oneflow`

**For Local**
```
npm i -D @tayloredtechnology/oneflow
```
Add relevant script entries to package.json for using **OneFlow**

### Examples

Create a new feature
```
@branch develop 
oneflow new feature startDev

# branch feature/startDev will be created and switched to
```

Finish feature development
```
@branch feature/startDev
oneflow end feature

# branch will be merged and deleted
```

Prepare for a GitHub only release
```
# assuming package.json -> version = 0.2.1

@branch develop
oneflow new release --gitonly

# assumed patch was required (same process if minor or major bump required)
# branch release/v0.2.2-rc.0 will be created and switched to
# Release Candidate v0.2.2-rc.0 will be pre-released on GitHub
# if --gitonly omitted will publish respecting tags correct release tags to NPM
```

Increment an existing patch release
```
# from example above

@branch release/v0.2.2-rc.0
oneflow new release --gitonly

# branch release/v0.2.2-rc.0 will be migrated to release/v0.2.2-rc.1
# Release Candidate v0.2.2-rc.1 will be pre-released to GitHub
```

Finish A Release
```
@branch release/v0.2.2-rc.1
oneflow end release --gitonly

# branch will be merged and deleted
# Release v0.2.2 will be published to GitHub
```

Develop a HotFix
```
# assuming last release v1.2.3

@branch develop
oneflow new hotfix

# branch hotfix/v1.2.4 will be created and switched to
```

Finish a HotFix
```
@branch hotfix/v1.2.4
oneflow end hotfix

# branch hotfix/v1.2.4 will be merged and deleted
# Release v1.2.4 will be published to GitHub
```

## Development

These instructions will get you a copy of the project up and running on your local machine for *development and testing* purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- Node 6.12.x or higher (LTS when development commenced)

### Installing

A step by step series of examples that tell you how to get a development env running

```
git clone git@github.com:TayloredTechnology/oneflow.git
cd oneflow
npm install
```

## Running the tests

[TAP](https://testanything.org/) is used for all tests

```
# Execute all application tests
npm test
```

Code Coverage is provided by [CodeCov](https://codecov.io).

### And coding style tests

[XO](https://github.com/sindresorhus/xo) is used with [Prettier](https://github.com/prettier/prettier) for linting & code style.

```
npm run lint
```

## Built With

- [CodeCov](http://codecov.io/)
- [Node @6.12.x](https://nodejs.org/docs/latest-v6.x/api/)
- [RenovateApp](http://renovateapp.com/)
- [SNYK](http://snyk.io/)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/TayloredTechnology/dynamic-k8pi/tags).

## Authors

- **Keidrych Anton-Oates** - *Initial work* - [Taylored Technology](https://tayloredtechnology.net)

See also the list of [contributors](https://github.com/TayloredTechnology/oneflow/contributors) who participated in this project.

## License

This project is licensed under the Mozilla Public License Version 2.0 - see the [LICENSE](LICENSE) file for details

## Acknowledgments

- NPM Community for consistenly making packages that accelerate development work
- [Test Anything Protocol](https://testanything.org/) for consistenly accelerating Feature Driven Design
