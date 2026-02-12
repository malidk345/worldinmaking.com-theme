import React from 'react';
console.log('React version:', React.version);
const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
console.log('Secret internals exists:', !!internals);
if (internals) {
    console.log('Keys:', Object.getOwnPropertyNames(internals));
}
