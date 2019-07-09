function init(){
    var select = ""
    for (var agent of window.selectedAgents){
     select += agent.name + ": " + agent.category + "</br>"
    }
    $("#selected").html(select)
}


function addAgent(){
    var agentId = $("#delegated_agents").val()
    var cat = $("#categories").val();
    var agent = {
      id: agentId,
      name: $("#delegated_agents option:selected").text(),
      category: cat
    }
    $("#categories").val('').trigger("change");
    var newAgent = true
    for (var i=0; i<window.selectedAgents.length; i++){
        var temp = window.selectedAgents[i]
        if (agentId == temp.id){
            window.selectedAgents[i] = agent
            newAgent = false
            break
        }
    }

    if (newAgent){
        window.selectedAgents.push(agent)
    }
    var select = ""
    for (var agent of window.selectedAgents){
        select += agent.name + ": " + agent.category + "</br>"
    }
    $("#selected").html(select)
}

function showMessageTemplate(){
    enableSaveButton()
    if ($("#send_confirm_sms").is(":checked"))
      $("#confirm_message").show()
    else
      $("#confirm_message").hide()
}

function saveSettings(){
  var url = "savesettings"
  var thirdparty = ($("#transcription_option").val() == "thirdparty") ? true : false
  var params = {
    third_party_transcription : thirdparty,
    transcribe_spam : $("#transcribe_spam").is(":checked"),
    send_confirm_sms : $("#send_confirm_sms").is(":checked"),
    message: $("#confirm_message").val(),
    assigned_agents: JSON.stringify(window.selectedAgents)
  }
  var getting = $.post( url, params );
  getting.done(function( res ) {
    if (res.status == "ok"){
      //alert(res.message)
      $("#save_btn").prop("disabled", true);
    }else
      alert(res.message)
  });
}
function toggleTranscriptionOption(){
  if ($("#transcription_option").val() == "thirdparty")
    $("#transcribe_spam_option").css("display", 'block');
  else
    $("#transcribe_spam_option").css("display", 'none');
  enableSaveButton()
}
function enableSaveButton(){
  $("#save_btn").prop("disabled", false);
}
