<?php

require_once('options_functions.inc.php');
require_once('interface.inc.php');

$page = (!isset($_GET['page'])) ? 'home' : $_GET['page'];


?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<style>
	body{
		background-color:#003366;
		text-align:center;
	}
	#top{
		width:968px;
		height:124px;
		background-image:url(images/head.jpg);
		text-align:left;
		margin:20px auto 0;
	}
	#main{
		width:968px;
		background-color:#FFFFFF;
		text-align:left;
		margin:0 auto;
	}
	.cat{
		width:120px;
		float:left;
		clear:left;
	}
	.input{
		clear:right;
	}
	</style>
	<script src="common.js" type="text/javascript"></script>
</head>
<body style='text-align:center;'>
	<div id='top'>&nbsp;
		<div id='menu'>
			<?php include("menu.inc.php"); ?>
		</div>
	</div>
	<div id='main'>
	<?php
	
	//echo "|".$page."|";
	//die;
	
	
	include("pages/".$page.".php");
	
	
	
	?>
	</div>
</body>
</html>