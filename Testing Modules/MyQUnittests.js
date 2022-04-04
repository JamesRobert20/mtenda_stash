$(document).ready(
    function()
    {
        $("#dom-tested").hide();

        const { test } = QUnit;
        var sinonClock = sinon.useFakeTimers();

        QUnit.module("Testing Inner Circle click");

            test("First inner Circle click", (assert) =>
            {
                // Trigger a click
                $(".innerCircle").trigger("click");

                // Initializing the async call
                //var done = assert.async();

                // This asssertion will wait for 1.05s
                //setTimeout(function()
                //{
                    sinonClock.tick(1050);
                    assert.equal( 
                        $(".outerCircle").css("cx") == $(".innerCircle").css("cx") &&
                        $(".outerCircle").css("cx") == "250px"
                    , true, "The circles moved down");
                //done();
                //}, 1050);
            
            
            });

            test("Second inner Circle click", (assert) =>
            {
                // Trigger a click
                $(".innerCircle").trigger("click");

                // Initializing the async call
                //var done = assert.async();

                // This asssertion will wait for 1.05s
                //setTimeout(function()
                //{
                    sinonClock.tick(1050);
                    assert.equal( 
                    $(".outerCircle").css("cx") == $(".innerCircle").css("cx") &&
                    $(".outerCircle").css("cx") == "150px"
                    , true, "The circles moved back to the center");
                //  done();
                //}, 1050);
            
            });

        QUnit.module("Testing Flip Panel click");
            
            test("Testing the panel toggle off", function (assert)
            {
                $("#flip").trigger("click");

                // Initializing the async call
                //var done = assert.async();

                // This asssertion will wait for 3.05s
                //setTimeout(function()
                //{
                    sinonClock.tick(3050);
                    assert.ok( $("svg").css("display") == "none" , "The SVG is now hidden");
                //  done();
                //}, 3050);
            });

            test("Testing the panel toggle on", function (assert)
            {
                $("#flip").trigger("click");

                // Initializing the async call
                //var done = assert.async();

                // This asssertion will wait for 3.05s
                //setTimeout(function()
                //{
                    sinonClock.tick(3050);
                    assert.ok( $("svg").css("display") == "inline" , "The SVG is now visible");
                //    done();
                //}, 3050);
            });
    }
);









































/*
//......Basic trial of QUnit test.......

function add(a , b)
{
    return a + b;
}
function subtract(a , b)
{
    return a - b;
}

QUnit.module("Testing Arithmetics");  

QUnit.test("two numbers added",  (assert) => 
{
    
    assert.equal( add(2,3) , 5, "worked");
});

QUnit.test("two numbers subtacted",  (assert) => 
{
    assert.equal( subtract(3,2) , 1, "also worked");
}); 
  */

/* 
const { test } = QUnit;


//.....Trying out modern syntax(All tests belong to upper module until another module is declared)..........
QUnit.module("Testing Arithmetics");

test("two numbers added",  (assert) => 
{
    assert.equal( add(2,3) , 5, "worked");
});

test("two numbers subtacted",  (assert) => 
{
    assert.equal( subtract(3,2) , 1, "also worked");
});
*/


/*
..........Trying out hooks with nested Groups.............. 
QUnit.module( "My Group", hooks => 
{

    // It is valid to call the same hook methods more than once.
    hooks.beforeEach( assert => {
        assert.ok( true, "beforeEach called" );
    });

    hooks.afterEach( assert => {
        assert.ok( true, "afterEach called" );
    });

    test( "with hooks", assert => {
        // 1 x beforeEach
        // 1 x afterEach
        assert.expect( 2 );
    });

    QUnit.module( "Nested Group", hooks => 
    {

        // This will run after the parent module's beforeEach hook
        hooks.beforeEach( assert => {
            assert.ok( true, "nested beforeEach called" );
        });

        // This will run before the parent module's afterEach
        hooks.afterEach( assert => {
            assert.ok( true, "nested afterEach called" );
        });

        test( "with nested hooks", assert => {
            // 2 x beforeEach (parent, current)
            // 2 x afterEach (current, parent)
            assert.expect( 4 );
        });
    });
});
*/


/* 
QUnit.module( "Database connection", 
{
    before: function() 
    {
        return new Promise( function( resolve, reject ) 
        {
            DB.connect( function( err )
            {
                if ( err )
                {
                    reject( err );
                }
                else 
                {
                    resolve();
                }
            });
        });
    },
    
    after: function() 
    {
        return new Promise( function( resolve, reject ) 
        {
            DB.disconnect( function( err )
            {
                if ( err ) 
                {
                    reject( err );
                }
                else
                {
                    resolve();
                }
            });
        });
    }
});
*/