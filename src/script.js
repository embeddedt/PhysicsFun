import 'core-js/features/promise'
import 'core-js/features/object/values'
import regeneratorRuntime from "regenerator-runtime";
import Swal from 'sweetalert2';

window.onload = async function() {
    let gameCodeFn = null;
    import(/* webpackPreload: true */ "./gameCode");
    const { value: levelNum } = await Swal.fire({
        title: 'Physics Fun',
        text: 'Welcome to Physics Fun! Choose a level:',
        input: 'select',
        inputOptions: {
            "1": 'Tutorial',
            "2": 'Avoid the spikes',
            "3": 'Drop zone',
            "4": 'Underground',
            "5": 'Square cliff',
            "6": 'Shadow valley'
        },
        allowOutsideClick: false,
        inputPlaceholder: 'Select a level',
        showLoaderOnConfirm: true,
        showCancelButton: false,
        inputValidator: (value) => {
            if(isNaN(parseInt(value)))
                return 'You need to choose a level.';
        },
        preConfirm: async(levelNum) => {
            gameCodeFn = (await import("./gameCode")).default;
            gameCodeFn(levelNum);
            await window.gameLoadPromise;
            this.document.getElementById("game-container").querySelector("canvas").style.opacity = "1";
            return levelNum;
        }
    });
}

