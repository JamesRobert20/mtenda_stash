
/*
//......Alternative to exporting...........
exports.add = function add(a,b) { return a + b; };

exports.subtract = function subtract(a, b) { return a - b; };
*/

function add(a, b)
{
    return a + b;
}
function subtract(a, b)
{
    return a - b;
}

module.exports = { add, subtract}