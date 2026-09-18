const { is } = Object;

const oldState = { xs: true, sm: true, md: true, lg: false, xl: false, xxl: false };
const newState = { xs: true, sm: true, md: true, lg: false, xl: false, xxl: false };

console.log(is(oldState, newState)); // false
