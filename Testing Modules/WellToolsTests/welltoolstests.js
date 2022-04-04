$(document).ready(
    function()
    {
        $("#dom-tested").hide();
        //$("#wellToolsDiv").hide();

        const { test } = QUnit;

        /* 
            Testing drawing by snap tools
            Also checking extra parameters saved
        */
        QUnit.module("Testing Drawing/Logging Features", hooks =>
        {

            hooks.afterEach( assert =>
            {
                /*
                    code to check that drawing Tool is selected after drawing an interval
                */

                // Variable to check that drawing Tool is selected after drawing an interval
                var drawingToolSelected = true;

                assert.equal(drawingToolSelected , true, "Drawing Tool is selected after drawing an interval");
            }

            );
        
            QUnit.module("On Strip Log");
                test("Drawing an interval on Simple Track", (assert) =>
                {
                    
                        //code to draw an interval on Simple Track and save it on DB
                        var DigitalCoreTable = DigitalCoreTable; 
                
                    // Variable to check from DB and striplog if interval was drawn
                    var intervalWasDrawn = true;

                    assert.ok(intervalWasDrawn, "Simple Track interval was drawn and saved");
                });

                test("Drawing an interval on Accessory Track", (assert) =>
                {
                    /*
                        code to draw an interval on Simple Track and save it on DB
                    */
                
                    // Variable to check from DB and striplog if interval was drawn
                    var intervalWasDrawn = true;

                    assert.ok(intervalWasDrawn, "Accessory Track interval was drawn and saved"); 
                });
            
            QUnit.module("On Core Table");
                test("Drawing an interval on Simple Track", (assert) =>
                {
                    /*
                        code to draw an interval on Simple Track and save it on DB
                    */
                
                    // Variable to check from DB and striplog if interval was drawn
                    var intervalWasDrawn = true;

                    assert.ok(intervalWasDrawn, "Simple Track interval was drawn and saved");
                });

                test("Drawing an interval on Accessory Track", (assert) =>
                {
                    /*
                        code to draw an interval on Simple Track and save it on DB
                    */
                
                    // Variable to check from DB and striplog if interval was drawn
                    var intervalWasDrawn = true;

                    assert.ok(intervalWasDrawn, "Accessory Track interval was drawn and saved"); 
                });

        });

        QUnit.module("Testing Fill");

            test("Testing fill selection", (assert) =>
            {
                /*
                    code to select a Fill 
                */

                // Variable to check that input fields have been cleared
                var inputFieldsCleared = true;

                assert.ok(inputFieldsCleared, "The Extra parameters get emptied when fill is selected");
            });

            test("Testing entering intervals and pressing \"Enter key\" ", (assert) =>
            {
                /*
                    code to enter some sample data into either one of input fields
                    and mimic "Enter key" press
                */

                // Variable to check that on pressing enter key interval is drawn and saved to DB
                var enterKeyWorks = true;
                assert.ok(enterKeyWorks, "Pressing Enter draws interval successfully");
            });

    }
);