const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const brokenSection = `      console.log('✅ Driver updated in dispatch.db:', dId);
      broadcastAdminState();
      socket.emit('admin_action_success', { message: 'Driver ' + dId + ' updated.' });

  
    socket.on('admin_save_tariff'`;

const fixedSection = `      console.log('✅ Driver updated in dispatch.db:', dId);
      broadcastAdminState();
      socket.emit('admin_action_success', { message: 'Driver ' + dId + ' updated.' });
    } catch (err) {
      console.error('Error updating driver:', err);
    }
  });

  socket.on('admin_save_tariff'`;

if (code.includes(brokenSection)) {
  code = code.replace(brokenSection, fixedSection);
  fs.writeFileSync('index.js', code);
  console.log('✅ Cleanly closed admin_update_driver handler and try/catch block!');
} else {
  // Regex fallback in case spacing differs slightly
  code = code.replace(
    /socket\.emit\('admin_action_success',\s*\{\s*message:\s*'Driver '\s*\+\s*dId\s*\+\s*' updated\.'\s*\}\);\s*socket\.on\('admin_save_tariff'/g,
    `socket.emit('admin_action_success', { message: 'Driver ' + dId + ' updated.' });
    } catch (err) {
      console.error('Error updating driver:', err);
    }
  });

  socket.on('admin_save_tariff'`
  );
  fs.writeFileSync('index.js', code);
  console.log('✅ Applied regex fix for admin_update_driver closure!');
}
