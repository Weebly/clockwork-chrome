Clockwork.factory('toolbar', function()
{

return {

    buttons: [],
    textboxes: [],

    createButton: function(icon, name, callback)
    {
        this.buttons.push({
            icon: icon,
            name: name,
            callback: callback
        });
    },

    createTextbox: function(label, name, callback)
    {
      this.textboxes.push({
        label: label,
        name: name,
        callback: callback
      })
    },

    render: function()
    {
        var $html = $('<div class="toolbar"></div>');

        $.each(this.textboxes, function(i, text)
        {
            var $text = $('<label for="'+text.name+'">'+text.label+'</label>: <input id="'+text.name+'"type="text" />');

            $text.on('blur', text.callback);

            $html.append($text);
        });

        $.each(this.buttons, function(i, button)
        {
            var $button = $('<a href="#" title="' + button.name + '"><i class="fa fa-' + button.icon + '"></i></a>');

            $button.on('click', button.callback);

            $html.append($button);
        });




        return $html;
    }

};

});
