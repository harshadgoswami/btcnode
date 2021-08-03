
export class LogHelper {

    async showLogs(action,apiName,user,token) {
        global['apiLogs']['action'] = action
        global['apiLogs']['apiName'] = apiName
        global['apiLogs']['date'] = new Date()
        global['apiLogs']['user'] = user
        global['apiLogs']['token'] = token
        console.log(new Date(),apiName,user,action)
    }

    async log(description,objFirst?, objSecond?, ObjThird? ){
        console.log(new Date(), description, objFirst, objSecond, ObjThird);
    }
}