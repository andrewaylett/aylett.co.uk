const BABEL_PROPOSAL_PRIVATE_METHODS = '@babel/plugin-proposal-private-methods';
const BABEL_TRANSFORM_PRIVATE_METHODS =
    '@babel/plugin-transform-private-methods';

function readPackage(pkg) {
    if (pkg.dependencies && pkg.dependencies[BABEL_PROPOSAL_PRIVATE_METHODS]) {
        pkg.dependencies[BABEL_PROPOSAL_PRIVATE_METHODS] =
            'npm:' + BABEL_TRANSFORM_PRIVATE_METHODS;
    }
    return pkg;
}

module.exports = {
    hooks: {
        readPackage,
    },
};
