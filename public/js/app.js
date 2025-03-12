document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburger');
  const close = document.getElementById('close');
const menu = document.getElementById('menu');

hamburger.addEventListener('click', function() {
  this.classList.toggle('active');
  menu.classList.toggle('menu-hidden')
  menu.classList.toggle('menu-visible');
});

close.addEventListener('click', function(){
  hamburger.classList.toggle('active')
menu.classList.toggle('menu-hidden')
menu.classList.toggle('menu-visible');
})


// const toggleSwitch = document.getElementById('themeToggle');
// const currentTheme = localStorage.getItem('theme') || 'light';

// function updateImageSrc(theme) {
//   const pageMockup = document.querySelector(".anonymous img");
//   if(pageMockup) {
//     if(theme === 'dark'){
//       pageMockup.src = "/img/iPhone-13-PRO-localhost (2).png"
//     } else {
//       pageMockup.src = "/img/iPhone-13-PRO-localhost.png"
//     }
//   } 
// }


// if(currentTheme === 'dark') {
//   document.documentElement.setAttribute('data-theme', 'dark');
//   toggleSwitch.checked = true;
//   updateImageSrc(currentTheme);
// } else {

// }

// document.documentElement.setAttribute('data-theme', currentTheme);
// toggleSwitch.checked = currentTheme === 'dark';
// updateImageSrc(currentTheme);


// toggleSwitch.addEventListener('change', function(){
//    if(this.checked) {
//     document.documentElement.setAttribute('data-theme', 'dark');
//     localStorage.setItem('theme', 'dark');
//     updateImageSrc('dark');
   
//    } else {
//     document.documentElement.setAttribute('data-theme', 'light');
//     localStorage.setItem('theme', 'light');
//     updateImageSrc('light');
//    }
// });



function showNotification(message) {
  const audio = new Audio("/sounds/system-notification-199277.mp3")
  audio.play();

if(Notification.permission === 'granted'){
  new Notification('Anonymcret', {
    body: message,
    icon: '/img/iPhone-13-PRO-localhost.png'
  });
 } else if(Notification.permission === 'default'){
  Notification.requestPermission().then(permission => {
    if(permission === 'granted'){
      new Notification('Anonymcret', {
        body: message,
        icon: '/img/iPhone-13-PRO-localhost.png'
      });
    }
  });
 }
}



//  if(Notification.permission !== 'granted') {
//   Notification.requestPermission();
//  }

//  function incrementNotificationCounter() {
//   if(Notification){
//     let count = 0;
//     notificationCounter.textContent = count++
//     localStorage.setItem('textContent', count++)
//   } else {
//     notificationCounter.textContent = 0
//     localStorage.setItem('textContent', notificationCounter.textContent) 
//   }
// }



 function recieveNotification(data){
  showNotification(data.message);
 }

 setTimeout(() => {
  recieveNotification({message: 'You have a new notificaton!'})
 }, 5000)

});

