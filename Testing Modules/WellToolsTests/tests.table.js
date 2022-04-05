QUnit.module('table', function(hooks) {
    hooks.beforeEach(function(){ 
        this.rootDiv = document.createElement('div');
        this.rootDiv.id = 'osdTestTable';
        document.querySelector('body').appendChild(this.rootDiv);
        this.table = new DigitalCoreTable.Table(this.rootDiv.id);
    });
    hooks.afterEach(function(){
        this.table = null;
        this.rootDiv.parentNode.removeChild(this.rootDiv);
        this.rootDiv = null;
        sinon.restore();
    });

    QUnit.test('_initialize', function( assert ) {      
        var rootSel = d3.select(this.rootDiv);        
        var osdContainerSel = rootSel.select('.openseadragon-container');
        var svgOverlaySel = osdContainerSel.select('svg');
        var defsSel = svgOverlaySel.select('defs');
        var cardboardPatternSel = defsSel.select('pattern#' + DigitalCoreTable.settings.cardboardPatternId);
    
        assert.ok(this.table.viewer != null, 'Viewer created');
        assert.ok(!osdContainerSel.empty(), 'OpenSeaDragon container created');
        assert.ok(!svgOverlaySel.empty(), 'SVG overlay created');
        assert.ok(!defsSel.empty(), 'SVG defs created');
        assert.ok(!cardboardPatternSel.empty(), 'Cardboard pattern created');
        assert.equal(osdContainerSel.style('background'), 'grey', 'OpenSeaDragon container background color set');
    });

    QUnit.module('loadWells', function(hooks) {
        hooks.beforeEach(function(){ 
            var uwis = ['100050109506W401', '101022005223W301', '102051604820W301'];
            this.srcs = uwis.map(uwi => {
                return { uwi: uwi, prefixToData: 'wells/' + uwi + '/' };
            });
            
            this.resetTracksStub = sinon.stub(DigitalCoreTable.Table.prototype, 'resetTracks');
            this.loadStub = sinon.stub(DigitalCoreTable.Well.prototype, 'load')
                .resolves();
        });

        QUnit.test('wells added and loaded', function( assert ) {
            var done = assert.async();
            var srcs = this.srcs;
            var table = this.table;            
            var loadStub = this.loadStub;         
            var p = table.loadWells(srcs);            
            p.then(() => {
                assert.equal(table.wells.length, srcs.length, 'Wells added');
                assert.equal(table.wells[0].uwi, srcs[0].uwi, 'Well uwis set');
                assert.equal(loadStub.callCount, srcs.length, 'Wells called load');
                assert.ok(loadStub.calledWith(srcs[0].prefixToData),'well.load called with data url prefix');
                done();
            });
        });     
        
        QUnit.test('resetTracks called', function( assert ) {
            var done = assert.async();
            var srcs = this.srcs;
            var table = this.table;
            var p = table.loadWells(srcs);
            p.then(() => {
                assert.ok(this.resetTracksStub.called,'resetTracks called');
                done();
            });
        });             

        QUnit.test('tracks added to wells', function( assert ) {
            var done = assert.async();
            var srcs = this.srcs;
            var table = this.table;
            var stub = sinon.stub(DigitalCoreTable.Well.prototype, 'addTrack');
            var fakeTracks = [sinon.fake(), sinon.fake()];
            table.tracks = fakeTracks;            
            var p = table.loadWells(srcs);
            p.then(() => {
                assert.equal(stub.callCount, fakeTracks.length * srcs.length,'wells called addTrack');
                assert.ok(stub.calledWith(fakeTracks[0]),'well.addTrack called with track parameter');
                done();
            });
        });          
        
        QUnit.test('_createCurveButton called', function( assert ) {
            var done = assert.async();
            var srcs = this.srcs;
            var table = this.table;

            var fakeCurveData = new DigitalCoreTable.CurveSet();
            fakeCurveData.curves = ['a', 'b', 'c'];
            this.loadStub.callsFake(function(){ this.curveSet = fakeCurveData; });
            // var wellConstructorStub = sinon.stub(DigitalCoreTable.Well, 'curveData').value(fakeCurveData);
            var createCurveButtonStub = sinon.stub(DigitalCoreTable.Table.prototype, '_createCurveButton');

            var p = table.loadWells(srcs);
            p.then(() => {     
                assert.ok(createCurveButtonStub.calledWith(fakeCurveData.curves[0]),'_createCurveButton called with curve argument');
                assert.ok(createCurveButtonStub.calledWith(fakeCurveData.curves[1]),'_createCurveButton called with curve argument');
                assert.ok(createCurveButtonStub.calledWith(fakeCurveData.curves[2]),'_createCurveButton called with curve argument');
                done();
            });
        });    
        
        QUnit.test('updated', function( assert ) {
            var done = assert.async();
            var srcs = this.srcs;
            var table = this.table;
            
            var addHandlerStub = sinon.stub(table.viewer, 'addOnceHandler');
            var openStub = sinon.stub(table.viewer, 'open');
            var updateModelStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateModel');
            var updateStub = sinon.stub(DigitalCoreTable.Table.prototype, 'update');

            var p = table.loadWells(srcs);
            p.then(() => {                
                // Fire the handler
                addHandlerStub.getCall(0).args[1]();
                assert.ok(openStub.called,'viewer called open');
                assert.ok(updateModelStub.called,'update model called');
                assert.ok(updateStub.called,'update called in response to open');
                done();
            });
        });            
    });

    QUnit.test('getOSDImageSrcs', function( assert ) {
        var table = this.table;
        var fakeSrcs = ['a', 'b', 'c'];        
        sinon.stub(DigitalCoreTable.Well.prototype, 'getOSDImageSrcs')
            .returns(fakeSrcs);
        table.wells = [ new DigitalCoreTable.Well(), new DigitalCoreTable.Well(), new DigitalCoreTable.Well() ];    
        var srcs = table.getOSDImageSrcs();        
        assert.equal(srcs[1], fakeSrcs[1], 'Source is correct');
        assert.equal(srcs.length, fakeSrcs.length * table.wells.length, 'Correct length of sources');
    });

    QUnit.test('update', function( assert ) {
        var table = this.table;
        var updateModelStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateModel');
        var updateOSDImagesStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateOSDImages');
        var updateFakeBoxesStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateFakeBoxes');
        var updateLabelsStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateLabels');
        var updateCurvesStub = sinon.stub(DigitalCoreTable.Table.prototype, 'updateCurves');
        table.update();
        assert.ok(updateModelStub.called, 'updateModel called');
        assert.ok(updateOSDImagesStub.called, 'updateOSDImages called');
        assert.ok(updateFakeBoxesStub.called, 'updateFakeBoxes called');
        assert.ok(updateLabelsStub.called, 'updateLabels called');
        assert.ok(updateCurvesStub.called, 'updateCurves called');
    });

    QUnit.test('getLabelSrcs', function( assert ) {
        var table = this.table;        
        var fakeSrcs = ['a', 'b', 'c'];        
        sinon.stub(DigitalCoreTable.Well.prototype, 'getLabelSrcs')
            .returns(fakeSrcs);
        table.wells = [ new DigitalCoreTable.Well(), new DigitalCoreTable.Well(), new DigitalCoreTable.Well() ];    
        var srcs = table.getLabelSrcs();        
        assert.equal(srcs[1], fakeSrcs[1], 'Source is correct');
        assert.equal(srcs.length, fakeSrcs.length * table.wells.length, 'Correct length of sources');
    });

    QUnit.module('updateLabels', function(hooks) {
        QUnit.test('Single update - check size', function( assert ) {
            var table = this.table;        
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part1',0,1,2), new DigitalCoreTable.LabelSource('part2',1,2,3), new DigitalCoreTable.LabelSource('part2',1,2,3), new DigitalCoreTable.LabelSource('part2',1,2,3)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  
            var sel = d3.select(this.rootDiv)
                .selectAll('text.DCTTubeLabel');        
            assert.equal(sel.size(), fakeSrcs.length, 'Correct number of elements');
        });
        QUnit.test('Single update - check attributes', function( assert ) {
            var table = this.table;        
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part1',0,1,2)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  
            var sel = d3.select(this.rootDiv)
                .select('text.DCTTubeLabel');        
            assert.equal(sel.style('font-size'), fakeSrcs[0].fontSize + 'px', 'Correct font size');
            assert.equal(sel.attr('x'), fakeSrcs[0].x, 'Correct x');
            assert.equal(sel.attr('y'), fakeSrcs[0].y, 'Correct y');
            assert.equal(sel.text(), fakeSrcs[0].text, 'Correct text');
        });
        QUnit.test('Double update - check size', function( assert ) {
            var table = this.table;        
            // Update 1
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part1',0,1,2), new DigitalCoreTable.LabelSource('part2',1,2,3), new DigitalCoreTable.LabelSource('part3',1,2,3), new DigitalCoreTable.LabelSource('part4',1,2,3)];
            var stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  
            stub.restore();

            // Update 2 
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part1',5,7,9), new DigitalCoreTable.LabelSource('part5',2,4,1)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  

            var sel = d3.select(this.rootDiv)
                .selectAll('text.DCTTubeLabel');        
            assert.equal(sel.size(), fakeSrcs.length, 'Correct number of elements');
        });
        QUnit.test('Double update - check attributes', function( assert ) {
            var table = this.table;        
            // Update 1
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part1',0,1,2), new DigitalCoreTable.LabelSource('part2',1,2,3), new DigitalCoreTable.LabelSource('part3',1,2,3), new DigitalCoreTable.LabelSource('part4',1,2,3)];
            var stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  
            stub.restore();
            // Update 2 
            var fakeSrcs = [new DigitalCoreTable.LabelSource('part5',2,4,1)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getLabelSrcs')
                .returns(fakeSrcs);
            table.updateLabels();  
            var sel = d3.select(this.rootDiv)
                .select('text.DCTTubeLabel');        
            assert.equal(sel.style('font-size'), fakeSrcs[0].fontSize + 'px', 'Correct font size');
            assert.equal(sel.attr('x'), fakeSrcs[0].x, 'Correct x');
            assert.equal(sel.attr('y'), fakeSrcs[0].y, 'Correct y');
            assert.equal(sel.text(), fakeSrcs[0].text, 'Correct text');
        });        
    });  

    QUnit.test('getFakeBoxSrcs', function( assert ) {
        var table = this.table;        
        var fakeSrcs = ['a', 'b', 'c'];        
        var trackTube = { getFakeBoxSrcs: sinon.stub().returns(fakeSrcs) };
        var fakeTubeGroup = {trackTubes: [trackTube, trackTube, trackTube]};
        var fakeWell = new DigitalCoreTable.Well();
        fakeWell.tubeGroups = [fakeTubeGroup,fakeTubeGroup,fakeTubeGroup];
        table.wells = [ fakeWell, fakeWell, fakeWell ];                   
        var srcs = table.getFakeBoxSrcs();        
        assert.equal(srcs[1], fakeSrcs[1], 'Source is correct');
        assert.equal(srcs.length, table.wells.length * fakeWell.tubeGroups.length * fakeTubeGroup.trackTubes.length * fakeSrcs.length, 'Correct length of sources');
    });

    QUnit.module('updateFakeBoxes', function(hooks) {
        QUnit.test('Single update - check size', function( assert ) {
            var table = this.table;        
            var fakeSrcs = [new DigitalCoreTable.FakeBoxSource(0,1,2,3), new DigitalCoreTable.FakeBoxSource(2,3,4,5), new DigitalCoreTable.FakeBoxSource(3,4,5,6)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();  
            var sel = d3.select(this.rootDiv)
                .selectAll('rect.DCTFakeBox');        
            assert.equal(sel.size(), fakeSrcs.length, 'Correct number of elements');
        });
        QUnit.test('Single update - check attributes', function( assert ) {
            var table = this.table;        
            var fakeSrcs = [new DigitalCoreTable.FakeBoxSource(0,1,2,3)];
            sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();  
            var sel = d3.select(this.rootDiv)
                .select('rect.DCTFakeBox');                
            assert.equal(sel.attr('x'), fakeSrcs[0].x, 'Correct x');
            assert.equal(sel.attr('y'), fakeSrcs[0].y, 'Correct y');
            assert.equal(sel.attr('width'), fakeSrcs[0].width, 'Correct width');
            assert.equal(sel.attr('height'), fakeSrcs[0].height, 'Correct height');            
        });
        QUnit.test('Double update - check size', function( assert ) {
            var table = this.table;     
            // Update 1   
            var fakeSrcs = [new DigitalCoreTable.FakeBoxSource(0,1,2,3), new DigitalCoreTable.FakeBoxSource(3,4,5,6)];
            var stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();  
            stub.restore();

            // Update 2   
            fakeSrcs = [new DigitalCoreTable.FakeBoxSource(0,1,2,3), new DigitalCoreTable.FakeBoxSource(2,3,4,5), new DigitalCoreTable.FakeBoxSource(3,4,5,6), new DigitalCoreTable.FakeBoxSource(4,5,6,7)];
            stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();       

            var sel = d3.select(this.rootDiv)
                .selectAll('rect.DCTFakeBox');        
            assert.equal(sel.size(), fakeSrcs.length, 'Correct number of elements');
        });
        QUnit.test('Double update - check attributes', function( assert ) {
            var table = this.table;     
            // Update 1   
            var fakeSrcs = [new DigitalCoreTable.FakeBoxSource(0,1,2,3), new DigitalCoreTable.FakeBoxSource(3,4,5,6)];
            var stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();  
            stub.restore();

            // Update 2   
            fakeSrcs = [new DigitalCoreTable.FakeBoxSource(6,7,8,9), new DigitalCoreTable.FakeBoxSource(2,3,4,5), new DigitalCoreTable.FakeBoxSource(3,4,5,6), new DigitalCoreTable.FakeBoxSource(4,5,6,7)];
            stub = sinon.stub(DigitalCoreTable.Table.prototype, 'getFakeBoxSrcs')
                .returns(fakeSrcs);
            table.updateFakeBoxes();       

            var sel = d3.select(this.rootDiv)
                .select('rect.DCTFakeBox');        
            assert.equal(sel.attr('x'), fakeSrcs[0].x, 'Correct x');
            assert.equal(sel.attr('y'), fakeSrcs[0].y, 'Correct y');
            assert.equal(sel.attr('width'), fakeSrcs[0].width, 'Correct width');
            assert.equal(sel.attr('height'), fakeSrcs[0].height, 'Correct height');     
        });        
    });   
    
    QUnit.module('updateOSDImages', function(hooks) {
        hooks.beforeEach(function(){       
            var fakeSrcs = [
                {
                    tileSource: 'ts1',
                    height: 10,
                    opacity: 1,
                    x: 2,
                    y: 3
                },
                {
                    tileSource: 'ts2',
                    height: 20,
                    opacity: 0,
                    x: 3,
                    y: 4
                },            
            ];
            this.fakeSrcs = fakeSrcs;
            sinon.stub(DigitalCoreTable.Table.prototype, 'getOSDImageSrcs')
                .returns(fakeSrcs);     
            
            this.setOpacityStub = sinon.stub();
            this.setPositionStub = sinon.stub();
            var fakeItem = { setPosition: this.setPositionStub, setOpacity: this.setOpacityStub };
            sinon.stub(this.table.viewer.world, 'getItemAt').returns(fakeItem);        
        });

        QUnit.test('set opacity argument check', function( assert ) {
            var table = this.table;           
            table.updateOSDImages();
            assert.ok(this.setOpacityStub.calledWith(this.fakeSrcs[0].opacity), 'Set opacity called with correct opacity');            
        }); 
        
        QUnit.test('set opacity call count', function( assert ) {
            var table = this.table;           
            table.updateOSDImages();            
            assert.equal(this.setOpacityStub.callCount, this.fakeSrcs.length, 'Set opacity called correct number of times');
        });          

        QUnit.test('set position call count', function( assert ) {
            var table = this.table;           
            table.updateOSDImages();           
            assert.equal(this.setPositionStub.callCount, this.fakeSrcs.length, 'Set position called correct number of times');
        });          

        QUnit.test('set position argument check', function( assert ) {
            var table = this.table;           
            table.updateOSDImages();
            var calledWithPosition = this.setPositionStub.getCall(0).args[0];                    
            assert.equal(calledWithPosition.x, this.fakeSrcs[0].x, 'setPosition called with correct x');
            assert.equal(calledWithPosition.y, this.fakeSrcs[0].y, 'setPosition called with correct y');
        });  
    });

  
});