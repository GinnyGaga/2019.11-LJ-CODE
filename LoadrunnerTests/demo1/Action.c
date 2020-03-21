Action()
{


	lr_rendezvous("login");


	web_reg_find("Text=\"code\": 200,",
		LAST);

	
	web_reg_save_param("token1",
		"LB=\"token\": \"",
		"RB=\"",
		LAST);

	lr_start_transaction("登录");

	web_custom_request("web_custom_request",
		"URL=http://132.232.44.158:5000/userLogin/",
		"Method=POST",
		"TargetFrame=",
		"Resource=0",
		"Referer=",
		"EncType=application/json",
		"Body={\"username\":\"{account}\", \"password\":\"{password}\", \"captcha\":\"123456\"}",
		LAST);

	lr_end_transaction("登录", LR_AUTO);


	// 思考时间
	// lr_think_time(5);


	web_reg_find("Text=\"code\": 200,",
		LAST);

	lr_start_transaction("回复文章");

	web_custom_request("web_custom_request",
		"URL=http://132.232.44.158:5000/articleComment/",
		"Method=POST",
		"TargetFrame=",
		"Resource=0",
		"Referer=",
		"EncType=application/json",
		"Body={\"id\":1, \"content\":\"no reapte!\",\"token\": \"{token1}\"}",
		LAST);

	lr_end_transaction("回复文章", LR_AUTO);



	


	return 0;
}
