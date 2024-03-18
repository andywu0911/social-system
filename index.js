// 建立資料庫連線
const mongo=require("mongodb");
const url="mongodb+srv://root:root123@mycluster.glwg3xq.mongodb.net/?retryWrites=true&w=majority&appName=MyCluster";
const client=new mongo.MongoClient(url);
let db=null; // null 代表尚未連線成功
async function initDB(){
    await client.connect();
    console.log("資料庫連線成功");
    db=client.db("social-system");
}
initDB();
// 建立網站伺服器基礎設定
const express=require("express");
const app=express();
const session=require("express-session");
app.use(session({
    secret:"anything",
    resave:false,
    saveUninitialized:true
}));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
// 建立需要的路由
app.get("/", function(req, res){
    res.render("index.html");
});
app.get("/member", async function(req, res){
    // 檢查使用者是否有透過登入程序，進入會員頁
    if(!req.session.member){
        res.redirect("/");
        return;
    }
    // 從 Session 取得登入會員的名稱
    const name=req.session.member.name;
    // 取得所有留言的訊息
    const collection=db.collection("message");
    let result=await collection.find({});
    let data=[];
    await result.forEach(function(message){
        data.push(message);
    });
    res.render("member.ejs", {name:name, data:data});
});
// 連線到 /error?msg=錯誤訊息
app.get("/error", function(req, res){
    const msg=req.query.msg;
    res.render("error.ejs", {msg:msg});
});
// 註冊會員功能的路由
app.post("/signup", async function(req, res){
    const name=req.body.name;
    const email=req.body.email;
    const password=req.body.password;
    // 檢查資料庫中的資料
    const collection=db.collection("member");
    let result=await collection.findOne({
        email:email
    });
    if(result!==null){ // Email 已經存在
        res.redirect("/error?msg=註冊失敗，信箱重複");
        return;
    }
    // 將新的會員資料放到資料庫
    result=await collection.insertOne({
        name:name, email:email, password:password
    });
    // 新增成功，導回首頁
    res.redirect("/");
});
// 登入會員功能的路由
app.post("/signin", async function(req, res){
    const email=req.body.email;
    const password=req.body.password;
    // 檢查資料庫中的資料
    const collection=db.collection("member");
    let result=await collection.findOne({
        $and:[
            {email:email},
            {password:password}
        ]
    });
    if(result===null){ // 沒有對應的會員資料，登入失敗
        res.redirect("/error?msg=登入失敗，郵件或密碼輸入錯誤");
        return;
    }
    // 登入成功，記錄會員資訊在 Session 中
    req.session.member=result;
    res.redirect("/member");
});
// 登出會員功能的路由
app.get("/signout", function(req, res){
    req.session.member=null;
    res.redirect("/");
});
// 留言功能的路由
app.get("/send", async function(req, res){
    const name=req.session.member.name;
    const message=req.query.message;
    // 取得當前時間
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = date_ob.getMonth() + 1;
    let date = date_ob.getDate();
    let hrs = date_ob.getHours();
    let mins = date_ob.getMinutes();
    let secs = date_ob.getSeconds();
    let cur_time = year + "/" + month + "/" + date + " " + hrs + ":" + mins + ":" + secs;
    // 將新的會員資料放到資料庫
    const collection=db.collection("message");
    await collection.insertOne({
        name:name, message:message, timestamp:cur_time
    });
    // 新增成功，導回會員頁
    res.redirect("/member");
});
// 啟動伺服器在 http://localhost:3000/
app.listen(3000, function(){
    console.log("Server Started");
});
