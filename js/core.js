var cdaxml='';
var hidden=new Array();
var firstsection=new Array();
var sectionorder=[];
var collapseall;
//localStorage.setItem("hidden", hidden);

$(document).ready(function(){
	$('.viewbtn').off('click').click(function(){
		var id_target=$(this).attr('id_target');
		$('.cdaview:not([id="'+id_target+'"])').hide()
		$('#'+id_target).show()
	})
	
	// Hide input section and show viewer by default
	$('#inputcda').hide();
	$('#viewcda').show();
	
	init()
	$('#ghrepos').click(function(){
		ghowner=$('#ghowner').val()
		var url='https://api.github.com/users/'+ghowner+'/repos?sort=asc';
		$.get( url, function( data ) {
			loadrepos(data)
		});
	})
	$('#ghsearch').click(function(){
		s=$('#ghowner').val()
		var url='https://api.github.com/search/repositories?q='+s+'&sort=stars&order=desc';
		$.get( url, function( data ) {
			loadrepos(data)
		});
	})

	$('#fileInput').change(function(){
        startProcessing($("#fileInput"), populateResults, populateError, populateProgress);		
	})
	
	// Get XML URL from URL parameters - handle URL-encoded AWS URLs
	var xmlUrl = '';
	
	// Get the full search string
	var fullSearch = window.location.search.substring(1); // Remove the leading ?
	
	// Extract everything after xmlUrl=
	if(fullSearch.includes('xmlUrl=')) {
		var startIndex = fullSearch.indexOf('xmlUrl=') + 7; // +7 for 'xmlUrl='
		// Get everything from xmlUrl= to the end or to the next standalone parameter
		var xmlUrlValue = fullSearch.substring(startIndex);
		
		// If the value is URL encoded, decode it
		try {
			xmlUrl = decodeURIComponent(xmlUrlValue);
		} catch(e) {
			// If decoding fails, use as-is
			xmlUrl = xmlUrlValue;
		}
	}
	
	// Fallback: Try URLSearchParams for simple cases
	if(!xmlUrl) {
		var urlParams = new URLSearchParams(window.location.search);
		xmlUrl = urlParams.get('xmlUrl') || '';
	}
	
	// Log the extracted URL for debugging
	console.log('Extracted xmlUrl:', xmlUrl);
	console.log('Full search string:', fullSearch);
	
	// Auto-load XML from URL parameter or default AWS URL on page load
	if(xmlUrl && xmlUrl.trim() !== '' && (xmlUrl.includes('http') || xmlUrl.includes('s3'))) {
		console.log('Loading XML from provided URL');
		loadXmlFromUrl(xmlUrl);
	} else {
		console.log('No valid xmlUrl found, loading default');
		loadXmlFromUrl('https://hws-pipeline-uat.s3.us-east-1.amazonaws.com/files-uat/1769534334617_ToC_Ambulatory.xml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIASS6FW6S6GIXHVV5U%2F20260128%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260128T100720Z&X-Amz-Expires=86400&X-Amz-Signature=ad77df493fde21ce402c80b5d9a1c18844ea82d6e6ea45821c546d5876fcb0d5&X-Amz-SignedHeaders=host&x-id=GetObject');
	}
})
function loadrepos(xhr){
	var ojson=xhr;
	if(xhr.items!==undefined)
		ojson=xhr.items
	else
		ojson=xhr
	var s='';
	for(var i=0,j=ojson.length; i<j; i++){
		o=ojson[i]
		s=s+'<p class="pure-button loadrepo" owner="'+o.owner.login+'" path="" title="'+o['description']+'" reponame="'+o['name']+'">'+o['name']+'</p>'
	}
	$('#github').html(s);

	$('#github').find('.loadrepo').click(function(){
		var reponame=$(this).attr('reponame')
		var owner=$(this).attr('owner')
		var url='https://api.github.com/repos/'+owner+'/'+reponame+'/contents'
		$.get(url,function(data){loadcontents(data,reponame,owner,'')})	
			.fail(function(){alert('Error - failed to retrieve data.')})
	})
}
function loadcontents(data,reponame,owner,path){
	var ojson=data;
	var s='';
	if(path.indexOf('/')!=-1){
		path=path.substring(0,path.indexOf('/'))
	}
	else
		path=''
		s=s+'<p class="pure-button loadrepo" path="'+path+'" owner="'+owner+'" reponame="'+reponame+'">..<i class="fa fa-level-up" /></p>'
	for(var i=0,j=ojson.length; i<j; i++){
		o=ojson[i]
		if((o['type']=='file')&&(o['name'].indexOf('.xml')>0))
			s=s+'<p class="pure-button transform" file="'+o['download_url']+'"><i class="fa fa-angle-double-right"></i>'+o['name']+'</p>'
		else if (o['type']=='dir'){
			s=s+'<p class="pure-button loadrepo" path="'+o['path']+'" owner="'+owner+'" reponame="'+reponame+'"><i class="fa fa-folder" /> '+o['name']+'</p>'
		}
	}
	$('#github').html(s);

	$('#github').find('.loadrepo').click(function(){
		var url='https://api.github.com/repos/'+$(this).attr('owner')+'/'+$(this).attr('reponame')+'/contents/'+$(this).attr('path')
		var reponame=$(this).attr('reponame')
		var owner=$(this).attr('owner')
		var path=$(this).attr('path')
		$.get(url,function(data){loadcontents(data,reponame,owner,path)})	
			.fail(function(){alert('Error - failed to retrieve data.')})
	})
	$('#github').find('.transform').off('click').click(function(){
		$('#viewcda').html('')
		if($(this).attr('file')!=undefined){
			cdaxml=$(this).attr('file')
		}
		new Transformation().setXml(cdaxml).setXslt('cda.xsl').transform("viewcda");
	})
}
function init(){
	sectionorder=[];
	$('li.toc[data-code]').each(function(){
		sectionorder.push($(this).attr('data-code'))
		/*
		$(this).hover(
			function(){
				var section=$('.section[data-code="'+$(this).attr('data-code')+'"] > .section_in')
				section.addClass('sectionhover')
			},
			function(){
				var section=$('.section[data-code="'+$(this).attr('data-code')+'"] > .section_in')
				section.removeClass('sectionhover')
			}
		)
		*/
	})
	
	$('.minimise').click(function(event){
		var section=$(this).closest('.section')
		$(this).toggleClass('fa-compress fa-expand')
		var sectiondiv=$(this).parent().parent().find('div:last')
		sectiondiv.slideToggle(function(){
			adjustWidth(section)
		})

	})
	var cdabody=$('#cdabody')
	
	cdabody.find('div.section').each(function() {
		var sect=$(this)
		$(this).hover(
			function(){
				$(this).find('.controls').show()
			},
			function(){
				$(this).find('.controls').hide()
			})
		$(this).find('table').each(function(){
			var tbl=$(this)
			if(tbl.width()>sect.width())
				sect.width(tbl.width()+20)

			var c=tbl.find('tr.duplicate').length
			if(c>0){
				if(c==1)
					var s=$('<tr class="all" style="cursor:pointer"><td colspan="5"><i class="fa fa-warning"></i> ('+c+') duplicate row hidden. Click here to <span class="show">show</span>.</td></tr>')
				else
					var s=$('<tr class="all" style="cursor:pointer"><td colspan="5"><i class="fa fa-warning"></i> ('+c+') duplicate rows hidden. Click here to <span class="show">show</span>.</td></tr>')
				tbl.prepend(s).on('click','tr.all',function(){
					if($(this).find('.show').text()=='show'){
						$(this).find('.show').text('hide')
						tbl.find('tr.duplicate').show()
					}
					else{
						$(this).find('.show').text('show')
						tbl.find('tr.duplicate').hide()
					}
					$('#cdabody').packery()
				})
			}
			c=tbl.find('tr.duplicatefirst').length
			if(c>0){
				if(c==1)
					var s=$('<tr class="first" style="cursor:pointer"><td colspan="5"><i class="fa fa-question-circle"></i> ('+c+') potential duplicate row. Click here to <span class="show1">hide</span>.</td></tr>')
				else
					var s=$('<tr class="first" style="cursor:pointer"><td colspan="5"><i class="fa fa-question-circle"></i> ('+c+') potential duplicate row. Click here to <span class="show1">hide</span>.</td></tr>')
				tbl.prepend(s).on('click','tr.first',function(){
					if($(this).find('.show1').text()=='show'){
						$(this).find('.show1').text('hide')
						tbl.find('tr.duplicatefirst').show()
					}
					else{
						$(this).find('.show1').text('show')
						tbl.find('tr.duplicatefirst').hide()
					}
					$('#cdabody').packery()
				})
			}
			//Turns on table sorting: User clicks on column header to sort the rows. Only sorts AB. Needs extension to date sorting before it is useful.
			/*
			tbl.find('th').click(function(){
				var table = $(this).parents('table').eq(0)
				var rows = table.find('tr:gt(0)').toArray().sort(comparer($(this).index()))
				this.asc = !this.asc
				if (!this.asc)
					{rows = rows.reverse()}
				for (var i = 0; i < rows.length; i++){table.append(rows[i])}
			})
			*/
		})
	})

	cdabody.packery({
		stamp:'.stamp',
		columnWidth: 'div.section:not(.narr_table)',
		//columnWidth: 160,
		transitionDuration: '0.2s',
		itemSelector: 'div.section',
		gutter:10
	});
	cdabody.find('div.section:not(.recordTarget)').each( function( i, gridItem ) {
		var draggie = new Draggabilly( gridItem );
		// bind drag events to Packery
		cdabody.packery( 'bindDraggabillyEvents', draggie );
	})

	cdabody.on( 'dragItemPositioned', function(){
		orderItems()
	});
	$('.toc').off('click').click(function(){
		var section=$('.section[data-code="'+$(this).attr('data-code')+'"]')
		if(section.is(':visible')){
			section.fadeOut(function(){
				$('#cdabody').packery()
				if(hidden.indexOf(section.attr('data-code'))==-1){
					hidden.push(section.attr('data-code'))
					localStorage.setItem("hidden", hidden);
				}
			})
			$(this).addClass('hide')
			$(this).find('i.tocli').removeClass('fa-check-square-o').addClass('fa-square-o')
		}
		else{
			section.addClass('fadehighlight').fadeIn(function(){
				$('#cdabody').packery();
				$(this).removeClass('fadehighlight')
				hidden.splice(hidden.indexOf(section.attr('data-code')),1)
				localStorage.setItem("hidden", hidden);
			})
			$(this).removeClass('hide')
			$(this).find('i.tocli').removeClass('fa-square-o').addClass('fa-check-square-o')
		}
		th=$('#tochead')
		if($('li.hide.toc[data-code]').length!=0){
			if(th.find('i.fa-warning').length==0)
				th.prepend('<i class="fa fa-warning fa-lg" style="margin-right:0.5em" title="Sections are hidden"></i>')				
		}
		else{
			th.find('i.fa-warning').remove()
		}
	})
	$('#tochead').off('click').click(function(){
		$('#toc').slideToggle(function(){
			$('#cdabody').packery();
		})
	})
	$('.tocup').off('click').click(function(event){
		var li=$(this).parent()
		var section=$('.section[data-code="'+li.attr('data-code')+'"]')
		moveup(section,li,true)
		event.stopPropagation();
		event.preventDefault();
	})
	$('.tocdown').off('click').click(function(event){
		var li=$(this).parent()
		var section=$('.section[data-code="'+li.attr('data-code')+'"]')
		movedown(section,li,true)
		event.stopPropagation();
		event.preventDefault();
	})
	$('.sectionup').click(function(event){
		var section=$(this).closest('.section')
		var li=$('.toc[data-code="'+section.attr('data-code')+'"]')
		moveup(section,li,true)
	})
	$('.sectiondown').click(function(event){
		var section=$(this).closest('.section')
		var li=$('.toc[data-code="'+section.attr('data-code')+'"]')
		movedown(section,li,true)
	})

	$('.hideshow').click(function(){
		var up=$(this).find('i').hasClass('fa-compress')
		
		if(up){
			$('div.sectiontext').slideUp(function(){
				adjustWidth($(this).parent().parent())
			})
			$('.minimise').addClass('fa-expand').removeClass('fa-compress')
		}
		else{
			$('div.sectiontext').slideDown(function(){
				adjustWidth($(this).parent().parent())
			})			
			$('.minimise').addClass('fa-compress').removeClass('fa-expand')
		}
		$('#cdabody').packery();
		$('.hideshow').find('i').toggleClass('fa-compress fa-expand')
		//$('.minimise').toggleClass('fa-compress fa-expand')
		localStorage.setItem("collapseall", up);

	})

	$('#restore').off('click').click(function(){
		$('#viewcda').html()
		localStorage.setItem("firstsection", []);
		new Transformation().setXml(cdaxml).setXslt('cda.xsl').transform("viewcda");
		alert('Order is restored')
		init()
		//location.reload()
	})
	$('#showall').click(function(){
		localStorage.setItem("hidden", []);
		//var section=$(this).closest('div.section')
		$('.section').each(function(){
			$(this).show()
			var code=$(this).attr('data-code')
			$('.toc[data-code="'+code+'"]').removeClass('hide').find('i.tocli').addClass('fa-check-square-o').removeClass('fa-square-o')
		})
		$('#cdabody').packery()	
	})
	$('.transform').off('click').click(function(){
		$('#viewcda').html('')
		if($(this).attr('file')!=undefined){
			cdaxml=$(this).attr('file')
		}
		else{
			cdaxml=$('#cdaxml').val()
		}
		
		//jquery $('#viewcda').xslt(cdaxml, './cda.xsl');
		
		new Transformation().setXml(cdaxml).setXslt('cda.xsl').transform("viewcda");
		//$('#inputcda').hide(function(){
			//$('#viewcda').show(function(){
				//init()
				//$('#inputcdabtn').show()
			//})
		//})
	})
	$('i.delete').click(function(){
		var section=$(this).closest('div.section')
		section.fadeOut(function(){
			var code=section.attr('data-code')
			if(hidden.indexOf(code)==-1){
				hidden.push(code)
				localStorage.setItem("hidden", hidden);
			}
			cdabody.packery()	
			$('.toc[data-code="'+code+'"]').addClass('hide').find('i.tocli').removeClass('fa-check-square-o').addClass('fa-square-o')
			th=$('#tochead')
			if($('li.hide.toc[data-code]').length!=0){
				if(th.find('i.fa-warning').length==0)
					th.prepend('<i class="fa fa-warning fa-lg" style="margin-right:0.5em" title="Sections are hidden"></i>')				
			}
			else{
				th.find('i.fa-warning').remove()
			}
		})		
	})


	
	if((typeof(Storage) !== "undefined")&&(localStorage!=undefined)) {
		collapseall=localStorage.collapseall
		//alert(collapseall)
		if((collapseall==undefined)||(collapseall=='false')){
			$('div.sectiontext').show(function(){
				//adjustWidth($(this).parent().parent())
			})
			$('.hideshow').find('i').addClass('fa-compress').removeClass('fa-expand')
			$('.minimise').addClass('fa-compress').removeClass('fa-expand')
		}
		else{
			$('div.sectiontext').hide(function(){
				//alert('asdf')
				adjustWidth($(this).parent().parent())
			})			
			$('.hideshow').find('i').addClass('fa-expand').removeClass('fa-compress')

			//$('.minimise').toggleClass('fa-compress fa-expand')
		}

		if(typeof(localStorage.hidden)!='undefined'){
			hidden=localStorage.hidden.split(',')
			var ihid=0;
			for (i = 0; i <hidden.length; i++){
				if((hidden[i]!==undefined)&&(hidden[i]!="")){
					var section=$('.section[data-code="'+hidden[i]+'"]')
					section.hide()
					$('.toc[data-code="'+hidden[i]+'"]').addClass('hide').find('i.tocli').removeClass('fa-check-square-o').addClass('fa-square-o')
					ihid++
				}
			}
			if(ihid>0){
				th=$('#tochead')
				th.prepend('<i class="fa fa-warning fa-lg" style="margin-right:0.5em" title="'+ihid+' sections are hidden"></i>')

			}
			if(typeof(localStorage.firstsection)!='undefined'){
			firstsection=localStorage.firstsection.split(',')
				if(firstsection.length>1){
					for (i = firstsection.length-1; i >-1; i--){
						if((firstsection[i]!==undefined)&&(firstsection[i]!="")){
							var section=$('.section[data-code="'+firstsection[i]+'"]')
							var li=$('.toc[data-code="'+section.attr('data-code')+'"]')
							moveup(section,li,false)							
							sectionorder.splice(sectionorder.indexOf(firstsection[i]),1)
						}
					}
				}
			}
		}
		
		for (i = 0; i <sectionorder.length; i++){
			firstsection.push(sectionorder[i])
		}
		$('#cdabody').packery('reloadItems');
		$('#cdabody').packery();
		var d=new Date();
		localStorage.setItem("lastaccess", d.getDate()+" "+d.getMonth()+" "+d.getFullYear());
	} else {
		$('#storagemsg').text('Your browser does not have localStorage - your preferences will not be saved')
	}


}
function adjustWidth(section){
	s=section.attr('style')
	var is=s.indexOf('width:')
	
	if(is>-1){
		var ie=s.indexOf('px;')
		sStart=s.substring(0,is)
		sEnd=s.substring(is,s.length)
		ie=sEnd.indexOf('px;');
		sEnd=sEnd.substring(ie+3,sEnd.length)
		s=sStart+sEnd;
		section.attr('style',s)
	}
	
	if(section.find('table').length>0){
		if(section.find('table').width()>section.width())
			section.width(section.find('table').width()+20)
	}
	$('#cdabody').packery();
	
}
function moveup(section,li,bRefresh){
	var curr=li
	curr.fadeOut(function(){
		var t=li.parent().find('li:first')
		t.before(curr)
		curr.fadeIn()
	})
	
	//section
	f=section.parent().find('div.section:eq(0)')
	f.before(section)
	if(bRefresh){
		var code=section.attr('data-code');
		if(firstsection.indexOf(code)==-1){
			firstsection.unshift(code)
		}
		else{
			firstsection.splice(firstsection.indexOf(code),1)
			firstsection.unshift(code)
		}
		localStorage.setItem("firstsection", firstsection);
		$('#cdabody').packery('reloadItems');
		$('#cdabody').packery();
	}

}
function movedown(section,li,bRefresh){
	curr=li
	curr.fadeOut(function(){
		t=curr.next('[data-code]')
		t.after(curr)
		curr.fadeIn()
	})

	//f=section.parent().find('div.section:eq(1)')
	f=section.next()
	f.after(section)
	if(bRefresh){
		var code=section.attr('data-code');
		if(firstsection.indexOf(code)==-1){
			firstsection.unshift(code)
		}
		else{
			var pos=firstsection.indexOf(code)
			if(pos<firstsection.length){
				var b=firstsection[pos+1];
				firstsection[pos+1]=firstsection[pos]
				firstsection[pos]=b
			}
			localStorage.setItem("firstsection", firstsection);
		}
		$('#cdabody').packery('reloadItems');
		$('#cdabody').packery();
	}
}
function orderItems(){
	firstsection=[];
	restore=$('#restore')
	var itemElems = $('#cdabody').packery('getItemElements');
	$( itemElems ).each( function( i, itemElem ) {
		var code=$( itemElem ).attr('data-code')
		firstsection.push(code)
		li=$('.toc[data-code="'+code+'"]')
		restore.before(li)
	});	
	localStorage.setItem("firstsection", firstsection);
}

function comparer(index) {
    return function(a, b) {
        var valA = getCellValue(a, index), valB = getCellValue(b, index)
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB)
    }
}
function getCellValue(row, index){ return $(row).children('td').eq(index).html() }

var xmload;
function loadXmlFromUrl(url){
	// Validate URL
	if(!url || url.trim() === '') {
		$('#viewcda').html('<div style="padding:20px;background:#ffebee;border:1px solid #ef5350;border-radius:4px;color:#c62828"><i class="fa fa-exclamation-circle"></i> <strong>No XML URL Provided</strong><br><br>Please provide an xmlUrl parameter in the URL.</div>');
		return;
	}
	
	// Show loading message
	$('#viewcda').html('<div style="padding:20px;text-align:center;font-size:16px;color:#666"><i class="fa fa-spinner fa-spin"></i> Loading XML document from: <br><small style="word-break:break-all;color:#999">' + url.substring(0, 80) + '...</small></div>');
	
	xmload = new XMLHttpRequest();
	xmload.onreadystatechange = function() {
		if (xmload.readyState == 4) {
			if (xmload.status == 200) {
				$('#cdaxml').val(xmload.responseText);
				cdaxml = xmload.responseText;
				// Automatically transform and view the XML
				$('#viewcda').html('');
				new Transformation().setXml(cdaxml).setXslt('cda.xsl').transform("viewcda");
				console.log('XML loaded successfully');
			} else {
				var errorMsg = 'HTTP Error ' + xmload.status;
				if(xmload.status === 400) errorMsg += ' - Bad Request (possibly invalid URL format)';
				if(xmload.status === 403) errorMsg += ' - Forbidden (access denied)';
				if(xmload.status === 404) errorMsg += ' - Not Found (file does not exist)';
				if(xmload.status === 0) errorMsg = 'CORS Error or Network Issue';
				
				console.log('Error loading XML:', errorMsg, 'URL:', url);
				$('#viewcda').html('<div style="padding:20px;background:#ffebee;border:1px solid #ef5350;border-radius:4px;color:#c62828"><i class="fa fa-exclamation-circle"></i> <strong>Error Loading Document</strong><br><br>' + errorMsg + '<br><br><small style="word-break:break-all;color:#999">URL: ' + url + '</small><br><br>Please check:<br>1. URL is correct and accessible<br>2. CORS is enabled on the server<br>3. File is publicly accessible</div>');
			}
		}
	};
	xmload.onerror = function() {
		console.log('Network error loading XML from:', url);
		$('#viewcda').html('<div style="padding:20px;background:#ffebee;border:1px solid #ef5350;border-radius:4px;color:#c62828"><i class="fa fa-exclamation-circle"></i> <strong>Network Error</strong><br><br>Unable to load XML file. Please check:<br>1. URL is correct and accessible<br>2. CORS is enabled on the server<br>3. File is publicly accessible<br>4. Check browser console for more details<br><br><small style="word-break:break-all;color:#999">URL: ' + url + '</small></div>');
	};
	xmload.onabort = function() {
		$('#viewcda').html('<div style="padding:20px;background:#ffebee;border:1px solid #ef5350;border-radius:4px;color:#c62828"><i class="fa fa-exclamation-circle"></i> <strong>Request Aborted</strong><br><br>The request was aborted. Please try again.</div>');
	};
	try{
		xmload.open("GET", url, true);
		xmload.send(null);
	}
	catch(e){
		console.log('Exception:', e.message);
		$('#viewcda').html('<div style="padding:20px;background:#ffebee;border:1px solid #ef5350;border-radius:4px;color:#c62828"><i class="fa fa-exclamation-circle"></i> <strong>Error</strong><br><br>' + e.message + '<br><br><small>Check browser console for details</small></div>');
	}
}

function loadtextarea(fname){
	xmload = new XMLHttpRequest();
	xmload.onreadystatechange = loaded;
	try{
		xmload.open("GET", fname,true);
	}
	catch(e){alert(e)}
	xmload.send(null);
}
var loaded = function() {
	if (xmload.readyState == 4) {
		$('#cdaxml').val(xmload.responseText)
		//$('#transform').get(0).click()
	}
}
