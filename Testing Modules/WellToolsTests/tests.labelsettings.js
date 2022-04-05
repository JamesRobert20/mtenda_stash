QUnit.module('label settings', function(hooks) {
    hooks.beforeEach(function(){ 
        this.labelSettings = DigitalCoreTable.settings.labelSettings;
        this.y0 = 10;
        this.labelSettings.wellFontSize = 3;
        this.labelSettings.tubeGroupFontSize = 1.5;
        this.labelSettings.trackTubeFontSize = 1;
        this.labelSettings.spacingFactor = 2;
    });
    hooks.afterEach(function(){
        sinon.restore();
    });

    QUnit.test('getWellLabelY', function( assert ) {      
        var y = this.labelSettings.getWellLabelY(this.y0);
        assert.equal(y, -7, 'Correct well label y');
    });
    QUnit.test('getTubeGroupIndexLabelY', function( assert ) {      
        var y = this.labelSettings.getTubeGroupIndexLabelY(this.y0);
        assert.equal(y, -1, 'Correct tube index label y');
    });
    QUnit.test('getTubeGroupFromLabelY', function( assert ) {      
        var y = this.labelSettings.getTubeGroupFromLabelY(this.y0);
        assert.equal(y, 2, 'Correct FROM label y');
    });
    QUnit.test('getTubeGroupToLabelY', function( assert ) {      
        var y = this.labelSettings.getTubeGroupToLabelY(this.y0);
        assert.equal(y, 5, 'Correct TO label y');
    });
    QUnit.test('getTrackTubeLabelY', function( assert ) {      
        var y = this.labelSettings.getTrackTubeLabelY(this.y0);
        assert.equal(y, 8, 'Correct track tube type label y');
    });
});