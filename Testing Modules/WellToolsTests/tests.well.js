QUnit.module('well', function(hooks) {
    hooks.beforeEach(function(){ 
        this.table = new DigitalCoreTable.Well();
    });
    hooks.afterEach(function(){
        sinon.restore();
    });

    QUnit.module('well', function(hooks) {
        QUnit.test('load', function( assert ) {  

        }); 
    });   

    QUnit.module('addTrack', function(hooks) {
        QUnit.test('addTrack', function( assert ) {  
            var addTrackFake = sinon.fake(DigitalCoreTable.TubeGroup.prototype, 'addTrack');
            
        }); 
    });       
});